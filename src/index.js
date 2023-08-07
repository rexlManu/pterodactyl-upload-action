const core = require("@actions/core");
const axios = require("axios").default;
const fs = require("fs").promises;
const path = require("path");

axios.defaults.headers.common.Accept = "application/json";

async function main() {
  try {
    const settings = await getSettings();
    configureAxios(settings.panelHost, settings.apiKey, settings.proxy);

    const { serverIds, sourceListPath, targetPath, restart, targets, decompressTarget } =
        settings;

    for (const serverId of serverIds) {
      for (const source of sourceListPath) {
        await validateSourceFile(source);
        const targetFile = getTargetFile(targetPath, source);
        const buffer = await fs.readFile(source);

        await uploadFile(serverId, targetFile, buffer);

        if (decompressTarget && isArchiveFile(targetFile)) {
          await decompressFile(serverId, targetFile);
        }
      }

      for (const element of targets) {
        const { source, target } = element;
        await validateSourceFile(source);
        const targetFile = getTargetFile(target, source);
        const buffer = await fs.readFile(source);

        await uploadFile(serverId, targetFile, buffer);

        if (decompressTarget && isArchiveFile(targetFile)) {
          await decompressFile(serverId, targetFile);
        }
      }

      if (restart) await restartServer(serverId);
    }

    core.info("Done");
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getSettings() {
  const panelHost = getInput("panel-host", { required: true });
  const apiKey = getInput("api-key", { required: true });
  const restart = getInput("restart") == "true";
  const proxy = getInput("proxy");
  const decompressTarget = getInput("decompress-target") == "true";

  let sourcePath = getInput("source");
  let sourceListPath = getMultilineInput("sources");
  let targetPath = getInput("target");
  let serverIdInput = getInput("server-id");
  let serverIds = getMultilineInput("server-ids");

  // Debug print out all the inputs
  core.debug(`restart: ${restart}`);
  core.debug(`source: ${sourcePath}`);
  core.debug(`sources: ${sourceListPath}`);
  core.debug(`target: ${targetPath}`);
  core.debug(`server-id: ${serverIdInput}`);
  core.debug(`server-ids: ${serverIds}`);

  const config = await readConfigFile();

  sourcePath = sourcePath || config.source || "";
  sourceListPath = sourceListPath.length
    ? sourceListPath
    : config.sources || [];
  targetPath = targetPath || config.target || "";
  serverIdInput = serverIdInput || config.server || "";
  serverIds = serverIds.length ? serverIds : config.servers || [];

  const targets = config.targets || [];

  // Debug print out all the config
  core.debug(`config: ${JSON.stringify(config)}`);

  // Debug print out all the inputs after config
  core.debug(`source: ${sourcePath}`);
  core.debug(`sources: ${sourceListPath}`);
  core.debug(`target: ${targetPath}`);
  core.debug(`server-id: ${serverIdInput}`);
  core.debug(`server-ids: ${serverIds}`);

  if (
    !sourcePath &&
    !sourceListPath.length &&
    (!targets.length || targets.length == 0)
  )
    throw new Error(
      "Either source or sources must be defined. Both are empty."
    );
  if (!serverIdInput && !serverIds.length)
    throw new Error(
      "Either server-id or server-ids must be defined. Both are empty."
    );

  if (sourcePath && !sourceListPath.length) sourceListPath = [sourcePath];
  if (serverIdInput && !serverIds.length) serverIds = [serverIdInput];

  return {
    panelHost,
    apiKey,
    restart,
    proxy,
    sourceListPath,
    targetPath,
    serverIds,
    targets,
    decompressTarget,
  };
}

function configureAxios(panelHost, apiKey, proxy) {
  axios.defaults.baseURL = panelHost;
  axios.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;

  if (proxy) {
    const [auth, hostPort] = proxy.split("@");
    const [username, password] = auth.split(":");
    const [host, port] = hostPort.split(":");

    axios.defaults.proxy = {
      protocol: "http",
      host,
      port,
      auth: { username, password },
    };
  }
}

async function validateSourceFile(source) {
  try {
    const stats = await fs.lstat(source);
    if (stats.isDirectory())
      throw new Error("Source must be a file, not a directory");
  } catch (error) {
    throw new Error(`Source file ${source} does not exist.`);
  }
}

function isArchiveFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return ['.zip', '.tar', '.tar.gz', '.tgz', '.rar'].includes(ext);
}

function getTargetFile(targetPath, source) {
  return targetPath.endsWith("/")
    ? path.join(targetPath, path.basename(source))
    : targetPath;
}

async function uploadFile(serverId, targetFile, buffer) {
  await axios.post(`/api/client/servers/${serverId}/files/write`, buffer, {
    params: { file: targetFile },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      core.info(
        `Uploading ${targetFile} to ${serverId} (${percentCompleted}%)`
      );
    },
  });
}

async function restartServer(serverId) {
  await axios.post(`/api/client/servers/${serverId}/power`, {
    signal: "restart",
  });
}

async function decompressFile(serverId, targetFile) {
  await axios.post(`/api/client/servers/${serverId}/files/decompress`, {
    root: "/",
    file: targetFile,
  });
}

function getInput(name, options = { required: false }) {
  return core.getInput(name, { ...options, trimWhitespace: true });
}

function getMultilineInput(name, options = { required: false }) {
  return core.getMultilineInput(name, { ...options, trimWhitespace: true });
}

async function readConfigFile() {
  const configFile = ".pterodactyl-upload.json";
  try {
    await fs.access(configFile);
    core.info(`Found ${configFile}, using it for configuration.`);
    const config = await fs.readFile(configFile, "utf8");
    return JSON.parse(config);
  } catch (error) {
    return {};
  }
}

main();
