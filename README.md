# Pterodactyl Upload Action

![GitHub release (latest by date)](https://img.shields.io/github/v/release/rexlmanu/pterodactyl-upload-action)
![GitHub](https://img.shields.io/github/license/rexlmanu/pterodactyl-upload-action)

This GitHub Action allows you to upload files to multiple Pterodactyl servers with just one action, featuring socket support.

## Usage

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
```

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

## License

Pterodactyl Upload Action is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
