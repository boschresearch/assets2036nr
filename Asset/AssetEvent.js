module.exports = function (RED) {
  function assetEvent(config) {
    RED.nodes.createNode(this, config);
    const mqtt = require('mqtt');
    const validate = require('jsonschema').validate;
    const node = this;

    const asset = RED.nodes.getNode(config.asset);
    const event = config.event;
    const client = mqtt.connect('mqtt://' + asset.brokerIP);

    const submodelDef = JSON.parse(asset.submodelDef);
    const mtopic = `${asset.namespace}/${asset.assetName}/${submodelDef.name}/${event}`;

    let featuresError = true;
    if ('events' in submodelDef) {
      if (event in submodelDef.events) {
        featuresError = false;
      }
    }

    client.on('connect', function () {
      if (featuresError) {
        node.status({ fill: "red", shape: "dot", text: "Events error" });
        node.log("Features error ");
      } else {
        node.status({ fill: "green", shape: "dot", text: "connected to " + asset.brokerIP });
        node.log("Client connected ");
      };
    });

    function validate_parameters(parameters, definition) {
      try {
        for (const [name, schema] of Object.entries(definition)) {
          const res = validate(parameters[name], schema);
          if (!(res.valid)) {
            return false;
          }
        }
      } catch (e) {
        return false;
      };
      return true;
    }

    function extract_valid_event_parameters(msg) {
      const schema = submodelDef.events[event].parameters;
      let res = validate_parameters(msg.payload, schema)
      if (res) {
        return msg.payload;
      }

      if (params in msg.payload) {
        res = validate_parameters(msg.payload.params, schema);
        if (res) {
          return msg.payload.params;
        }
      }

      if (params in msg) {
        res = validate(msg.params, schema);
        if (res) {
          return msg.params;
        }
      }

      return undefined;
    }

    node.on('input', function (msg) {
      const params = extract_valid_event_parameters(msg);
      if (typeof params === "undefined") {
        node.log("Received invalid parameters");
        return
      }
      const mmsgObj = {
        timestamp: new Date().toISOString(),
        params: params
      };

      const mmsg = JSON.stringify(mmsgObj);
      node.log(mtopic);
      node.log(mmsg);
      const options = { retain: false };
      client.publish(mtopic, mmsg, options);

    });

    node.on('close', function () {
      client.end();
      node.log("Client end.");
    });
  }
  RED.nodes.registerType("AssetEvent", assetEvent);
}
