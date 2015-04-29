'use strict';

var App = window.App || {
  host: document.location.host || 'localhost:8080',
  protocol: ('https:' == document.location.protocol) ? 'https://' : 'http://',
  console : 'ws://' + (document.location.host || 'localhost:8080') + '/console',
  
  /**
   * Get supported boards.
   */
  boardsAsync : function(callback) {
    $.getJSON(App.protocol + App.host + '/api/boards')
      .success(callback)
      .fail(callback);
  },
  
  /**
   * Get available ports.
   */
  portsAsync : function(callback) {
    $.getJSON(App.protocol + App.host + '/api/ports')
      .success(callback)
      .fail(callback);
  },
  
  /**
   * Run some code.
   */
  run : function(board, port, code) {
    if (!App.key) {
      $.getJSON(App.protocol + App.host + '/api/auth', function(data) {
        App.key = data.key;
        App.run(board, port, code);
      });
      return;
    }
    
    $.ajax({
      url: App.protocol + App.host + '/api/run',
      type: 'POST',
      contentType : 'application/json',
      headers: { 'X-BlocklyDuino-Key': App.key },
      data: JSON.stringify({ board: board, port: port, code: code })
    });
    
    if (!App.websocket) {
      var WebSocket = (window.WebSocket || window.MozWebSocket);
      var connect = function() {
        if (App.websocket) return;
        var socket = new WebSocket(App.console);
        App.websocket = socket;
        
        socket.onclose = function(e) {
          App.websocket = false;
          setTimeout(connect, 3000);
        };
        
        socket.onopen = function(e) {
          socket.send(JSON.stringify({ key: App.key }));
        };
        
        socket.onmessage = function(e) {
          var data = $.parseJSON(e.data);
          Code.Console[data.level](data.msg);
        };
      };
      connect();
    }
  }
};
