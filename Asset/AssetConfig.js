module.exports = function (RED) {
  function assetConfig(n) {
    RED.nodes.createNode(this, n);
    this.brokerIP = n.brokerIP;
    this.brokerPort = n.brokerPort;
    this.assetName = n.assetName;
    this.namespace = n.namespace;
    this.submodelURL = n.submodelURL;
    this.submodelDef = n.submodelDef;
  }
  RED.nodes.registerType("AssetConfig", assetConfig);
}