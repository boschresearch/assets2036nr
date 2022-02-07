module.exports = function (RED) {
  function assetOperationREQ(config) {
    RED.nodes.createNode(this, config);
    const mqtt = require('mqtt');

    const asset = RED.nodes.getNode(config.asset);
    const operation = config.operation;

    const node = this;

    const client = mqtt.connect('mqtt://' + asset.brokerIP);

    const submodelDef = JSON.parse(asset.submodelDef);
    const mtopic = `${asset.namespace}/${asset.assetName}/${submodelDef.name}/${operation}/REQ`;
    let featuresError = true;
    if ('operations' in submodelDef) {
      if (operation in submodelDef.operations) {
        featuresError = false;
      }
    }

    client.on('connect', function () {
      if (featuresError) {
        node.status({ fill: "red", shape: "dot", text: "Operations error" });
        node.log(`Error! Submodel ${submodelDef.name} specifies no operations!`);
      } else {

        client.subscribe(mtopic);
        node.status({
          fill: "green",
          shape: "dot",
          text: "connected to " + asset.brokerIP
        });
        node.log("Client connected. ");
      };
    });

    client.on('message', function (topic, message) {

      try {
        const messageObj = JSON.parse(message);
        const msg = {
          payload: messageObj.params,
          _assets2036: {
            req_id: messageObj.req_id,
            operation: operation
          }
        };
        node.log("Message: " + message.toString())
        node.send(msg);
      }
      catch (e) {
        node.log(e);
      }
    });

    node.on('close', function () {
      client.end();
      node.log("Client end.");
    });
  }
  RED.nodes.registerType("AssetOperationREQ", assetOperationREQ);
}
