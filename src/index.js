const core = require("@actions/core");
const github = require("@actions/github");
const StaticAxios = require("axios");
const axios = StaticAxios.create({
  headers: {
    Accept: "application/json",
  },
});
const fs = require("fs");

async function exec(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    child.stdout.on("data", (data) => {
      process.stdout.write(data);
    });
    child.stderr.on("data", (data) => {
      process.stderr.write(data);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Command ${command} ${args.join(" ")} exited with code ${code}`
          )
        );
      }
      resolve();
    });
  });
}

async function zip(srcDir, targetFile) {
  await exec("zip", ["-r", targetFile, "."], { cwd: srcDir });
}

async function main() {
  try {
    const panelHost = core.getInput("panel-host", {
      required: true,
      trimWhitespace: true,
    });
    const apiKey = core.getInput("api-key", {
      required: true,
      trimWhitespace: true,
    });
    const sourcePath = core.getInput("source", {
      required: false,
      trimWhitespace: true,
    });
    let sourceListPath = core.getMultilineInput("sources", {
      required: false,
      trimWhitespace: true,
    });
    const targetPath = core.getInput("target", {
      required: true,
      trimWhitespace: true,
    });
    const serverIdInput = core.getInput("server-id", {
      required: false,
      trimWhitespace: true,
    });
    let serverIds = core.getMultilineInput("server-ids", {
      required: false,
      trimWhitespace: true,
    });
    const restart =
      core.getInput("restart", {
        required: false,
        trimWhitespace: true,
      }) == "true";

    const proxy = core.getInput("proxy", {
      required: false,
      trimWhitespace: true,
    });

    // check if sourcePath and sourceListPath are both empty
    if (!sourcePath && !sourceListPath) {
      throw new Error(
        "Either source or sources must be defined. Both are empty."
      );
    }
    // check if serverId and serverIds are both empty
    if (!serverIdInput && !serverIds) {
      throw new Error(
        "Either server-id or server-ids must be defined. Both are empty."
      );
    }
    if (sourcePath && !sourceListPath) {
      sourceListPath = [sourcePath];
    }
    if (serverIdInput && !serverIds) {
      serverIds = [serverIdInput];
    }

    axios.defaults.baseURL = panelHost;
    axios.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;

    if (proxy) {
      axios.defaults.proxy = {
        protocol: "http",
        host: proxy.split("@")[1].split(":")[0],
        port: proxy.split("@")[1].split(":")[1],
        auth: {
          username: proxy.split("@")[0].split(":")[0],
          password: proxy.split("@")[0].split(":")[1],
        },
      };
    }

    // for each server
    for (let serverId of serverIds) {
      for (let source of sourceListPath) {
        const isDirectory = fs.lstatSync(source).isDirectory();
        let targetFile = targetPath;

        if (isDirectory) {
          const zipFile = `${source}.zip`;
          await zip(source, zipFile);
          source = zipFile;

          if (!fs.existsSync(source)) {
            throw new Error(`Source file ${source} does not exist.`);
          }

          targetFile = `${targetPath}.zip`;
        }

        const buffer = fs.readFileSync(source);

        const fileUploadResponse = await axios.post(
          `/api/client/servers/${serverId}/files/write`,
          buffer,
          {
            params: {
              file: targetFile,
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              core.info(
                `Uploading ${source} to ${serverId} (${percentCompleted}%)`
              );
            },
          }
        );
        core.info(fileUploadResponse.data);
        core.info(fileUploadResponse.status);

        if (isDirectory) {
          const decompressResponse = await axios.post(
            `/api/client/servers/${serverId}/files/decompress`,
            {
              root: targetPath,
              file: targetFile,
            }
          );
          core.info(decompressResponse.data);
          core.info(decompressResponse.status);
        }
      }
    }

    if (restart) {
      const powerResponse = await axios.post(
        `/api/client/servers/${serverId}/power`,
        {
          signal: "restart",
        }
      );

      core.info(powerResponse.data);
      core.info(powerResponse.status);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
