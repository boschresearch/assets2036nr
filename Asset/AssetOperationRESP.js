module.exports = function (RED) {
  function assetOperationRESP(config) {
    RED.nodes.createNode(this, config);
    const mqtt = require('mqtt');
    const validate = require('jsonschema').validate;

    const asset = RED.nodes.getNode(config.asset);
    const node = this;

    const client = mqtt.connect('mqtt://' + asset.brokerIP);
    const submodelDef = JSON.parse(asset.submodelDef);

    client.on('connect', function () {
      node.status({
        fill: "green", shape: "dot",
        text: "connected to " + asset.brokerIP
      });
      node.log("Client connected ");
    });

    function extract_valid_response(msg) {
      const schema = submodelDef.operations[msg._assets2036.operation].response;
      let res = validate(msg.payload, schema)
      if (res.valid) {
        return msg.payload;
      }

      if ("resp" in msg.payload) {
        res = validate(msg.payload.resp, schema);
        if (res.valid) {
          return msg.payload.resp;
        }
      }

      if ("resp" in msg) {
        res = validate(msg, schema);
        if (res.valid) {
          return msg;
        }
      }

      return undefined;
    }

    node.on('input', function (msg) {
      const mtopic = `${asset.namespace}/${asset.assetName}/${submodelDef.name}/${msg._assets2036.operation}/RESP`;
      const resp = extract_valid_response(msg);
      if (typeof resp === "undefined") {
        node.log("invalid response given!");
        return;
      }
      const mmsgObj = {
        req_id: msg._assets2036.req_id,
        resp: resp
      };
      const options = { retain: true };
      const mmsg = JSON.stringify(mmsgObj);
      client.publish(mtopic, mmsg, options);
    });

    node.on('close', function () {
      client.end();
      node.log("Client end.");
    });
  }
  RED.nodes.registerType("AssetOperationRESP", assetOperationRESP);
}
