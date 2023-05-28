const core = require("@actions/core");
const github = require("@actions/github");
const StaticAxios = require("axios");
const axios = StaticAxios.create({
  headers: {
    Accept: "application/json",
  },
});
const fs = require("fs");

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
    let sourcePath = core.getInput("source", {
      required: false,
      trimWhitespace: true,
    });
    let sourceListPath = core.getMultilineInput("sources", {
      required: false,
      trimWhitespace: true,
    });
    let targetPath = core.getInput("target", {
      required: true,
      trimWhitespace: true,
    });
    let serverIdInput = core.getInput("server-id", {
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

    // check if .pterodactyl-upload.json exists
    if (fs.existsSync(".pterodactyl-upload.json")) {
      core.info("Found .pterodactyl-upload.json, using it for configuration.");
      const config = JSON.parse(
        fs.readFileSync(".pterodactyl-upload.json", "utf8")
      );

      sourcePath = sourcePath || config.source;
      sourceListPath = sourceListPath || config.sources;
      targetPath = targetPath || config.target;
      serverIdInput = serverIdInput || config.server;
      serverIds = serverIds || config.servers;
    }

    // check if sourcePath and sourceListPath are both empty
    if (!sourcePath && sourceListPath.length == 0) {
      throw new Error(
        "Either source or sources must be defined. Both are empty."
      );
    }
    // check if serverId and serverIds are both empty
    if (!serverIdInput && serverIds.length == 0) {
      throw new Error(
        "Either server-id or server-ids must be defined. Both are empty."
      );
    }
    if (!!sourcePath && sourceListPath.length == 0) {
      sourceListPath = [sourcePath];
    }
    if (!!serverIdInput && serverIds.length == 0) {
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
          throw new Error("Source must be a file, not a directory");
        }

        if (!fs.existsSync(source)) {
          throw new Error(`Source file ${source} does not exist.`);
        }

        // check if targetFile is a directory
        if (targetFile.endsWith("/")) {
          // if targetFile is a directory, append the source filename to the targetFile
          targetFile += source.split("/").pop();
        }

        const buffer = fs.readFileSync(source);

        await axios.post(
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
      }

      if (restart) {
        await axios.post(`/api/client/servers/${serverId}/power`, {
          signal: "restart",
        });
      }
    }

    core.info("Done");
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
