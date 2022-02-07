module.exports = function (RED) {
  function assetProperty(config) {
    RED.nodes.createNode(this, config);
    const mqtt = require('mqtt');
    const validate = require('jsonschema').validate;

    const asset = RED.nodes.getNode(config.asset);
    const property = config.property;

    const node = this;
    const client = mqtt.connect('mqtt://' + asset.brokerIP);
    const submodelDef = JSON.parse(asset.submodelDef);
    const mtopic = `${asset.namespace}/${asset.assetName}/${submodelDef.name}/${property}`;

    let featuresError = true;
    if ('properties' in submodelDef) {
      if (property in submodelDef.properties) {
        featuresError = false;
      }
    }

    client.on('connect', function () {
      if (featuresError) {
        node.status({ fill: "red", shape: "dot", text: "Property error" });
        node.log("Features error ");
      } else {
        node.status({ fill: "green", shape: "dot", text: "connected to " + asset.brokerIP });
        node.log("Client connected ");
      };
    });


    function extract_valid_property(msg) {
      const schema = submodelDef.properties[property];
      let res = validate(msg.payload, schema)
      if (res.valid) {
        return msg.payload;
      }

      if (property in msg.payload) {
        res = validate(msg.payload.property, schema);
        if (res.valid) {
          return msg.payload.property;
        }
      }

      if (property in msg) {
        res = validate(msg.property, schema);
        if (res.valid) {
          return msg.property;
        }
      }

      return undefined;
    }

    node.on('input', function (msg) {
      const prop = extract_valid_property(msg);
      if (typeof prop === "undefined") {
        node.log("invalid property found");
        return;
      }
      const mmsg = JSON.stringify(prop);
      const options = { retain: true };
      client.publish(mtopic, mmsg, options);
    });

    node.on('close', function () {
      client.end();
      node.log("Client end.");
    });
  }
  RED.nodes.registerType("AssetProperty", assetProperty);
}
