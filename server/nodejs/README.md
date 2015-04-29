## BlocklyDuino node server

This folder contains server side on node.js for the BlocklyDuino app.

### Getting started

First, choose a version of [Arduino] (http://www.arduino.cc).
Set the path of your arduino executable in ENV:

    ARDUINOPATH=path to arduino executable

Or in the code [index.js] (index.js):

    arduinoPath = process.env.ARDUINOPATH || 'path to arduino executable',

Run with node:

```bash
npm install
node index.js
```

The page can be accessed at [localhost:8080/app/] (http://localhost:8080/app/).
