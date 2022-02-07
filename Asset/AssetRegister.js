const _endpointDefinition = {
  "name": "_endpoint",
  "revision": "0.0.3",
  "description": "Meldet Online- und Healthy-Status eines Assets",
  "properties": {
    "online": {
      "description": "Asset ist online, der Adapter ist erreichbar",
      "type": "boolean"
    },
    "healthy": {
      "description": "Asset ist healthy, der Adapter ist bereit",
      "type": "boolean"
    }
  },
  "events": {
    "log": {
      "description": "Logging Event",
      "parameters": {
        "entry": {
          "description": "Logging Text",
          "type": "string"
        }
      }
    }
  },
  "operations": {
    "shutdown": {
      "description": "Asset ausschalten",
      "parameters": {}
    },
    "restart": {
      "description": "Asset neu starten",
      "parameters": {}
    },
    "ping": {
      "description": "Ping Asset",
      "parameters": {}
    }
  }
}


module.exports = function (RED) {
  function assetRegister(config) {
    const node = this;
    RED.nodes.createNode(this, config);
    const mqtt = require('mqtt');
    const asset = RED.nodes.getNode(config.asset);
    const submodelDefinition = JSON.parse(asset.submodelDef);

    const mtopic = `${asset.namespace}/${asset.assetName}/${submodelDefinition.name}/_meta`;
    const endpointtopic = `${asset.namespace}/${asset.assetName}/_endpoint`;
    const msgObj = {
      source: `${asset.namespace}/${asset.assetName}`,
      submodel_definition: submodelDefinition,
      submodel_url: asset.submodelURL
    };
    const endpointMsg = {
      source: `${asset.namespace}/${asset.assetName}`,
      submodel_definition: _endpointDefinition,
      submodel_url: "https://raw.githubusercontent.com/boschresearch/assets2036-submodels/master/_endpoint.json"
    };
    const mmsg = JSON.stringify(msgObj);
    const options = { retain: true };
    const client = mqtt.connect('mqtt://' + asset.brokerIP, { will: { topic: endpointtopic + "/online", payload: "false", retain: true } });

    function registerEndpoint() {
      client.publish(endpointtopic + "/_meta", JSON.stringify(endpointMsg), options);
    }

    function setOnline() {
      client.publish(endpointtopic + "/online", "true", options);
    }

    client.on('connect', function () {
      node.status({ fill: "green", shape: "dot", text: "connected to " + asset.brokerIP });
      node.log("Client connected.");
      registerEndpoint();
      setOnline();
    });

    node.on('input', function (msg) {
      client.publish(mtopic, mmsg, options);
      node.send(msg);
    }
    );
    node.on('close', function () {
      client.end();
      node.log("Client end.");
    });
  }
  RED.nodes.registerType("AssetRegister", assetRegister);
}
