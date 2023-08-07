# Pterodactyl Upload Action

![GitHub release (latest by date)](https://img.shields.io/github/v/release/rexlmanu/pterodactyl-upload-action)
![GitHub](https://img.shields.io/github/license/rexlmanu/pterodactyl-upload-action)

This GitHub Action allows you to upload files to multiple Pterodactyl servers with just one action, featuring socket support.

## Usage

## Api Key

You have to create a client api key in the pterodactyl panel. You can do this in the panel under `Account` -> `API Credentials`.

### Inputs

1. `panel-host`: (**Required**) The host URL of the Pterodactyl panel.
2. `api-key`: (**Required**) The API key for the Pterodactyl panel.
3. `server-id`: ID of the target server.
4. `server-ids`: IDs of the target servers (multiline).
5. `source`: Source file to be uploaded.
6. `sources`: Source files to be uploaded (multiline).
7. `target`: Destination of the file on the server. Can be a file name (for a single source) or a directory name ending with a slash (for multiple files).
8. `proxy`: Proxy to be used for upload (username:password@host:port).

### Example Workflow Configuration

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Pterodactyl
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - run: echo "Hello world" > hello.txt
      - uses: rexlmanu/pterodactyl-upload-action@v1
        with:
          panel-host: ${{ secrets.PANEL_HOST }}
          api-key: ${{ secrets.API_KEY }}
          server-id: "5f095019"
          #   server-ids: |
          #     5f095019
          #     7f095019
          source: "hello.txt"
          #   sources: |
          #     hello.txt
          #     hello2.txt
          target: "./"
          # If you want to restart the servers after successful upload
          # restart: true
          # If you want to decompress the files after successful upload
          # decompress-target: true
```

## File Decompression

`decompress-target` allows decompression of archive files (`.zip, .tar, .tar.gz, .tgz, .rar`) after they are uploaded to the server. If you have multiple targets, it will decompress all valid compressed ones. If this option is not provided or set to false, files will be uploaded as is, without decompression.

### Multiple File/Server Example

Uncomment lines for `server-ids`, `sources`, and `proxy` in the above example as necessary.

## Configuration File

An optional `.pterodactyl-upload.json` file can be created in the root of your repository to define server(s), source file(s), and the target.

### Example Configuration File

```json
{
  "server": "5f095019",
  "servers": ["5f095019", "7f095019"],
  "source": "hello.txt",
  "sources": ["hello.txt", "hello2.txt"],
  "target": "./"
}
```

#### Multiple different targets

If you need different targets for each file, you can provide a list of targets.

```json
{
  "targets": {
    "source": "hello.txt",
    "target": "./"
  }
}
```

## License

Pterodactyl Upload Action is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
