# Brewtoad export script

Quick and dirty script for exporting recipes from Brewtoad since it's [shutting down on 2018-12-31](https://web.archive.org/web/20181209140603/https://www.brewtoad.com/shutdown).

The script uses Chromium (via Puppeteer) to generate a PDF of each recipe. It also downloads the recipes as BeerXML and JSON.

## Requirements

- A recent version of Node.js (tested with v8.12)
- Yarn

## Usage

First clone the repo, then:

```
yarn install
node index.js PROFILE_URL [USERNAME] [PASSWORD]
```

Replace `PROFILE_URL` with the URL to your recipes on Brewtoad (e.g. <https://www.brewtoad.com/users/45285/recipes>).

`USERNAME` and `PASSWORD` are _optional_. If all your recipes are public you don't need to sign in.

### Examples

```sh
# Fetch recipes without signing in:
node index.js https://www.brewtoad.com/users/45285/recipes

# Fetch recipes as a signed in user:
node index.js https://www.brewtoad.com/users/45285/recipes user@example.com supersecret123
```

## Limitations

- Doesn't handle any sort of pagination on the recipes page (I don't have enough recipes for that)
- There's no error handling, if something explodes the script stops
- It worked for me as is, it might explode for whatever reason in your case
- Brewtoad is unreliable now, things may or may not work
