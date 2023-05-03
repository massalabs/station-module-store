import * as jsonschema from "jsonschema";
import * as jsonfile from "jsonfile";
import fetch from "node-fetch";
import { structure } from ".";
const slugify = require("slugify");
const semver = require("semver");
const STORE_LIST_URL =
  "https://raw.githubusercontent.com/massalabs/thyra-plugin-store/main/plugins.json";

type Asset = {
  url: string;
  checksum: string;
};

type TypePlugin = {
  name: string;
  logo: string;
  description: string;
  thyra_version: string;
  assets: {
    windows: Asset;
    linux: Asset;
    "macos-arm64": Asset;
    "macos-amd64": Asset;
  };
  version: string;
  url: string;
};

export class StorePlugin {
  name: string;
  logo: string;
  description: string;
  thyra_version: string;
  assets: {
    windows: Asset;
    linux: Asset;
    "macos-arm64": Asset;
    "macos-amd64": Asset;
  };
  version: string;
  url: string;

  constructor(plugin: TypePlugin) {
    this.name = plugin.name;
    const name_slugified = slugify(plugin.name); // replace spaces with dashes
    const pluginAssetDirectory = `assets/${name_slugified}`; // replace spaces with dashes
    this.logo = `${pluginAssetDirectory}/${plugin.logo}`;
    this.description = plugin.description;
    this.thyra_version = plugin.thyra_version;
    this.assets = plugin.assets;
    this.version = plugin.version;
    this.url = plugin.url;
  }

  isFollowingStructure() {
    return jsonschema.validate(this, structure).errors.length == 0;
  }

  pluginInLastStoreVersion(lastVersion: StorePlugin[]) {
    return lastVersion.find(
      (lastVersionPlugin) => lastVersionPlugin.name === this.name
    );
  }
  getPluginLastVersion(lastVersionPlugins: StorePlugin[]) {
    return lastVersionPlugins.find(
      (lastVersionPlugin) => lastVersionPlugin.name === this.name
    );
  }
  isNewVersionHigher(lastVersionPlugins: StorePlugin[]) {
    let lastVersionPlugin = this.getPluginLastVersion(lastVersionPlugins);
    if (!lastVersionPlugin) {
      throw new Error("Plugin not found in last version");
    }
    return semver.gt(this.version, lastVersionPlugin.version);
  }
}

export async function getPlugins() {
  const pluginsData: StorePlugin[] = await jsonfile.readFile("plugins.json");
  const lastVersion: StorePlugin[] = await fetch(STORE_LIST_URL).then((res) =>
    res.json()
  );
  const plugins: StorePlugin[] = [];
  for (const plugin of pluginsData) {
    const storePlugin = new StorePlugin(plugin);
    if (storePlugin.isFollowingStructure()) {
      plugins.push(storePlugin);
    } else {
      throw Error(`Invalid plugin object: ${JSON.stringify(plugin)}`);
    }
  }

  let commonPlugins: StorePlugin[] = [];
  let newPlugins: StorePlugin[] = [];
  let updatedPlugins: StorePlugin[] = [];

  plugins.forEach((plugin) => {
    let lastVersionPlugin = lastVersion.find(
      (lastVersionPlugin) => lastVersionPlugin.name === plugin.name
    );

    if (lastVersionPlugin) {
      let isSameVersion = plugin.version === lastVersionPlugin.version;
      if (isSameVersion) {
        commonPlugins.push(plugin);
      } else {
        updatedPlugins.push(plugin);
      }
    } else {
      newPlugins.push(plugin);
    }
  });

  return {
    plugins,
    lastVersion,
    commonPlugins,
    newPlugins,
    updatedPlugins,
  };
}
