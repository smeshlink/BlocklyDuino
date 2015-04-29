/**
 * Blockly Demos: Code
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview JavaScript for Blockly's Code demo.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

/**
 * Create a namespace for the application.
 */
var Code = {};

/**
 * Lookup for names of supported languages.  Keys should be in ISO 639 format.
 */
Code.LANGUAGE_NAME = {
  'en': 'English',
  'zh-hans': '簡體中文',
  'zh-hant': '正體中文'
};

/**
 * List of RTL languages.
 */
Code.LANGUAGE_RTL = ['ar', 'fa', 'he'];

/**
 * Extracts a parameter from the URL.
 * If the parameter is absent default_value is returned.
 * @param {string} name The name of the parameter.
 * @param {string} defaultValue Value to return if paramater not found.
 * @return {string} The parameter value or the default value if not found.
 */
Code.getStringParamFromUrl = function(name, defaultValue) {
  var val = location.search.match(new RegExp('[?&]' + name + '=([^&]+)'));
  return val ? decodeURIComponent(val[1].replace(/\+/g, '%20')) : defaultValue;
};

/**
 * Get the language of this user from the URL.
 * @return {string} User's language.
 */
Code.getLang = function() {
  var lang = Code.getStringParamFromUrl('lang', '');
  if (!lang) {
    lang = (navigator.language || navigator.browserLanguage).toLowerCase();
    if (lang === 'zh-cn') {
      lang = 'zh-hans';
    } else {
      var pos = lang.indexOf('-');
      if (pos >= 0) lang = lang.substring(0, pos);
      if (lang === 'zh') lang = 'zh-hant';
    }
  }
  if (Code.LANGUAGE_NAME[lang] === undefined) {
    // Default to English.
    lang = 'en';
  }
  return lang;
};

/**
 * Is the current language (Code.LANG) an RTL language?
 * @return {boolean} True if RTL, false if LTR.
 */
Code.isRtl = function() {
  return Code.LANGUAGE_RTL.indexOf(Code.LANG) != -1;
};

/**
 * Load blocks saved on App Engine Storage or in session/local storage.
 * @param {string} defaultXml Text representation of default blocks.
 */
Code.loadBlocks = function(defaultXml) {
  try {
    var loadOnce = window.sessionStorage.loadOnceBlocks;
  } catch(e) {
    // Firefox sometimes throws a SecurityError when accessing sessionStorage.
    // Restarting Firefox fixes this, so it looks like a bug.
    var loadOnce = null;
  }
  if ('BlocklyStorage' in window && window.location.hash.length > 1) {
    // An href with #key trigers an AJAX call to retrieve saved blocks.
    BlocklyStorage.retrieveXml(window.location.hash.substring(1));
  } else if (loadOnce) {
    // Language switching stores the blocks during the reload.
    delete window.sessionStorage.loadOnceBlocks;
    var xml = Blockly.Xml.textToDom(loadOnce);
    Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
  } else if (defaultXml) {
    // Load the editor with default starting blocks.
    var xml = Blockly.Xml.textToDom(defaultXml);
    Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
  } else if ('BlocklyStorage' in window) {
    // Restore saved blocks in a separate thread so that subsequent
    // initialization is not affected from a failed load.
    window.setTimeout(BlocklyStorage.restoreBlocks, 0);
  }
};

/**
 * Save the blocks and reload with a different language.
 */
Code.changeLanguage = function() {
  // Store the blocks for the duration of the reload.
  // This should be skipped for the index page, which has no blocks and does
  // not load Blockly.
  // MSIE 11 does not support sessionStorage on file:// URLs.
  if (typeof Blockly != 'undefined' && window.sessionStorage) {
    var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
    var text = Blockly.Xml.domToText(xml);
    window.sessionStorage.loadOnceBlocks = text;
  }

  var languageMenu = document.getElementById('languageMenu');
  var newLang = encodeURIComponent(
      languageMenu.options[languageMenu.selectedIndex].value);
  var search = window.location.search;
  if (search.length <= 1) {
    search = '?lang=' + newLang;
  } else if (search.match(/[?&]lang=[^&]*/)) {
    search = search.replace(/([?&]lang=)[^&]*/, '$1' + newLang);
  } else {
    search = search.replace(/\?/, '?lang=' + newLang + '&');
  }

  window.location = window.location.protocol + '//' +
      window.location.host + window.location.pathname + search;
};

/**
 * Bind a function to a button's click event.
 * On touch enabled browsers, ontouchend is treated as equivalent to onclick.
 * @param {!Element|string} el Button element or ID thereof.
 * @param {!Function} func Event handler to bind.
 */
Code.bindClick = function(el, func) {
  if (typeof el == 'string') {
    el = document.getElementById(el);
  }
  if (el) {
    el.addEventListener('click', func, true);
    el.addEventListener('touchend', func, true);
  }
};

/**
 * Load the Prettify CSS and JavaScript.
 */
Code.importPrettify = function() {
  //<link rel="stylesheet" href="../prettify.css">
  //<script src="../prettify.js"></script>
  var link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', 'css/prettify.css');
  document.head.appendChild(link);
  var script = document.createElement('script');
  script.setAttribute('src', 'js/prettify.js');
  document.head.appendChild(script);
};

/**
 * Compute the absolute coordinates and dimensions of an HTML element.
 * @param {!Element} element Element to match.
 * @return {!Object} Contains height, width, x, and y properties.
 * @private
 */
Code.getBBox_ = function(element) {
  var height = element.offsetHeight;
  var width = element.offsetWidth;
  var x = 0;
  var y = 0;
  do {
    x += element.offsetLeft;
    y += element.offsetTop;
    element = element.offsetParent;
  } while (element);
  return {
    height: height,
    width: width,
    x: x,
    y: y
  };
};

/**
 * User's language (e.g. "en").
 * @type string
 */
Code.LANG = Code.getLang();

/**
 * List of tab names.
 * @private
 */
Code.TABS_ = ['blocks', 'arduino', 'xml'];

Code.selected = 'blocks';

/**
 * Switch the visible pane when a tab is clicked.
 * @param {string} clickedName Name of tab clicked.
 */
Code.tabClick = function(clickedName) {
  // If the XML tab was open, save and render the content.
  if (document.getElementById('tab_xml').className == 'tabon') {
    var xmlTextarea = document.getElementById('content_xml');
    var xmlText = xmlTextarea.value;
    var xmlDom = null;
    try {
      xmlDom = Blockly.Xml.textToDom(xmlText);
    } catch (e) {
      var q =
          window.confirm(MSG['badXml'].replace('%1', e));
      if (!q) {
        // Leave the user on the XML tab.
        return;
      }
    }
    if (xmlDom) {
      Blockly.mainWorkspace.clear();
      Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xmlDom);
    }
  }

  // Deselect all tabs and hide all panes.
  for (var i = 0; i < Code.TABS_.length; i++) {
    var name = Code.TABS_[i];
    document.getElementById('tab_' + name).className = 'taboff';
    document.getElementById('content_' + name).style.visibility = 'hidden';
  }

  // Select the active tab.
  Code.selected = clickedName;
  document.getElementById('tab_' + clickedName).className = 'tabon';
  // Show the selected pane.
  document.getElementById('content_' + clickedName).style.visibility =
      'visible';
  Code.renderContent();
  Blockly.fireUiEvent(window, 'resize');
  if (clickedName == 'blocks') {
    setTimeout(function() { Blockly.mainWorkspace.render(); }, 1);
  }
};

/**
 * Populate the currently selected pane with content generated from the blocks.
 */
Code.renderContent = function() {
  var content = document.getElementById('content_' + Code.selected);
  // Initialize the pane.
  if (content.id == 'content_xml') {
    var xmlTextarea = document.getElementById('content_xml');
    var xmlDom = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
    var xmlText = Blockly.Xml.domToPrettyText(xmlDom);
    xmlTextarea.value = xmlText;
    xmlTextarea.focus();
  } else if (content.id == 'content_arduino') {
    var code = Blockly.Arduino.workspaceToCode();
    content.textContent = code;
    if (typeof prettyPrintOne == 'function') {
      code = content.innerHTML;
      code = prettyPrintOne(code, 'cpp');
      content.innerHTML = code;
    }
    content.focus();
  }
};

/**
 * Blockly toolbar.
 */
Code.Toolbox = {
  visible_ : true,
  toggle : function() {
    Code.Toolbox.show(!Code.Toolbox.visible_);
  },
  show : function(show, callback) {
    var btn = document.getElementById('button_toggle_toolbox'),
      btnIcon = document.getElementById('button_toggle_toolbox_icon');
    Code.Toolbox.visible_ = show;
    if (show === false) {
      Blockly.mainWorkspace.toolbox_.flyout_.hide();
      $('.blocklyToolboxDiv').slideUp(300, function() {
        btn.style.maxWidth = btn.style.width;
        btn.style.width = '';
        btnIcon.className = 'mdi-action-visibility';
        callback && callback();
      });
      btn.className = btn.className.replace('off', 'on');
    } else {
      $('.blocklyToolboxDiv').slideDown(300, callback);
      btn.className = btn.className.replace('on', 'off');
      btn.style.width = btn.style.maxWidth;
      btn.style.maxWidth = '';
      btnIcon.className = 'mdi-action-visibility-off';
    }
  }
};

/**
 * Console.
 */
Code.Console = {
  show : function() {
    $('#modal-console').openModal();
  },
  log : function(msg) {
    if (msg != null) {
      var cs = document.getElementById('console-content');
      cs.innerHTML += msg;
      $('#modal-console').scrollTop(cs.scrollHeight);
    }
  },
  logln : function(msg) {
    if (msg != null)
      Code.Console.log(msg + '\n');
  },
  error : function(msg) {
    if (msg != null)
      Code.Console.log('<span style="color:red">' + msg + '</span>');
  },
  errorln : function(msg) {
    if (msg != null)
      Code.Console.log('<span style="color:red">' + msg + '</span>\n');
  },
  debug : function(msg) {
    console.debug(msg);
  }
};

/**
 * Run code via backend server.
 */
Code.Runner = {
  init : function() {
    if (!('App' in window)) return;
    
    if ('init' in App) App.init();
    
    if ('boards' in App || 'boardsAsync' in App) {
      // TODO board setting
      var setupBoards = function(boards) {
        if (boards.length) App.board = boards[0];
      };
      if ('boards' in App) {
        var result = App.boards();
        if (typeof result === 'string') {
          try { result = $.parseJSON(result); } catch (e) { }
        }
        setupBoards(result);
      } else if ('boardsAsync' in App) {
        App.boardsAsync(setupBoards);
      }
    }
    
    if ('ports' in App || 'portsAsync' in App) {
      var $dropdown = $('#dropdown-ports'),
        $selected = $('#select-port');
      $dropdown.on('click', 'a', function() {
        if (this.id == 'btn-refresh-ports')
          Code.Runner.refreshPorts();
        else
          $selected.text(App.port = this.textContent);
      }).parent().show();
      Code.Runner.refreshPorts();
    }
    
    if ('run' in App) {
      var btnRun = document.getElementById('btn-run'),
        menuRun = document.getElementById('menu-run');
      btnRun.style.display = '';
      menuRun.style.display = '';
      Code.bindClick(btnRun, Code.Runner.run);
      Code.bindClick(menuRun, Code.Runner.run);
    }
    
    if ('browsers' in App) {
      var $dropdown = $('#dropdown-browsers');
      var result = App.browsers();
      if (typeof result === 'string') {
        try { result = $.parseJSON(result); } catch (e) { }
      }
      $.each(result, function() {
        $('<li/>').append($('<a href="#"/>').text(this)).appendTo($dropdown);
      });
      $dropdown.on('click', 'a', function() {
        App.browse(this.textContent);
        $('.button-collapse').sideNav('hide');
      }).closest('li').show();
    }
  },
  
  refreshPorts : function() {
    var $dropdown = $('#dropdown-ports').empty(),
        $selected = $('#select-port');
    
    function setupPorts(ports) {
      if (ports.length) {
        $.each(ports, function() {
          $('<li/>').append($('<a href="#"/>').text(this)).appendTo($dropdown);
        });
        if (!App.port)
          $selected.text(App.port = ports[0]);
      } else {
        App.port = null;
        $selected.text(MSG['nonePort']);
      }
      $dropdown.append('<li><a id="btn-refresh-ports" href="#">' + MSG['refreshPorts'] + '</a></li>');
    }
    
    if ('ports' in App) {
      var result = App.ports();
      if (typeof result === 'string') {
        try { result = $.parseJSON(result); } catch (e) { }
      }
      setupPorts(result);
    } else if ('portsAsync' in App) {
      App.portsAsync(setupPorts);
    }
  },
  
  run : function() {
    var code = Code.selected == 'arduino'
      ? document.getElementById('content_arduino').textContent
      : Blockly.Arduino.workspaceToCode();
    Code.Console.show();
    Code.Console.logln(App.port ? 'Running...' : 'Building...');
    App.run(App.board, App.port, code);
  }
};

Code.bindActions_ = function() {
  Code.bindClick('btn-trash',
      function() { if (Code.discard()) Code.renderContent(); });
  Code.bindClick('btn-load', Code.load);
  Code.bindClick('btn-save', Code.save);
  
  Code.bindClick('menu-trash', function() {
    if (Code.discard()) {
      Code.renderContent();
      $('.button-collapse').sideNav('hide');
    }
  });
  Code.bindClick('menu-load', function() {
    Code.load();
    $('.button-collapse').sideNav('hide');
  });
  Code.bindClick('menu-save', function() {
    Code.save();
    $('.button-collapse').sideNav('hide');
  });
      
  Code.bindClick('button_toggle_toolbox', Code.Toolbox.toggle);

  for (var i = 0; i < Code.TABS_.length; i++) {
    var name = Code.TABS_[i];
    Code.bindClick('tab_' + name,
        function(name_) {return function() {Code.tabClick(name_);};}(name));
  }
};

/**
 * Initialize Blockly.  Called on page load.
 */
Code.init = function() {
  Code.initLanguage();

  var rtl = Code.isRtl();
  var container = document.getElementById('content_area');
  var onresize = function(e) {
    var bBox = Code.getBBox_(container);
    for (var i = 0; i < Code.TABS_.length; i++) {
      var el = document.getElementById('content_' + Code.TABS_[i]);
      el.style.top = bBox.y + 'px';
      el.style.left = bBox.x + 'px';
      // Height and width need to be set, read back, then set again to
      // compensate for scrollbars.
      el.style.height = bBox.height + 'px';
      //el.style.height = (2 * bBox.height - el.offsetHeight) + 'px';
      el.style.width = bBox.width + 'px';
      //el.style.width = (2 * bBox.width - el.offsetWidth) + 'px';
    }
    if (Code.Toolbox.visible_ && Blockly.mainWorkspace.toolbox_.width > 0) {
      document.getElementById('button_toggle_toolbox').style.width =
          (Blockly.mainWorkspace.toolbox_.width + 1) + 'px';
    }
  };
  window.addEventListener('resize', onresize, false);

  var toolbox = document.getElementById('toolbox');
  Blockly.inject(document.getElementById('content_blocks'),
      {grid:
          {spacing: 25,
           length: 3,
           colour: '#ccc',
           snap: true},
       media: '../BlocklyDuino/blockly/media/',
       rtl: rtl,
       toolbox: toolbox});

  Code.loadBlocks('');

  if ('BlocklyStorage' in window) {
    // Hook a save function onto unload.
    BlocklyStorage.backupOnUnload();
  }

  Code.tabClick(Code.selected);
  Blockly.fireUiEvent(window, 'resize');

  Code.bindActions_();

  // Lazy-load the syntax-highlighting.
  window.setTimeout(Code.importPrettify, 1);
  
  Code.Runner.init();
};

/**
 * Initialize the page language.
 */
Code.initLanguage = function() {
  // Set the HTML's language and direction.
  // document.dir fails in Mozilla, use document.body.parentNode.dir instead.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=151407
  var rtl = Code.isRtl();
  document.head.parentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  document.head.parentElement.setAttribute('lang', Code.LANG);

  var languageMenu = document.getElementById('languageMenu');
  if (languageMenu) {
    // Sort languages alphabetically.
    var languages = [];
    for (var lang in Code.LANGUAGE_NAME) {
      languages.push([Code.LANGUAGE_NAME[lang], lang]);
    }
    var comp = function(a, b) {
      // Sort based on first argument ('English', 'Русский', '简体字', etc).
      if (a[0] > b[0]) return 1;
      if (a[0] < b[0]) return -1;
      return 0;
    };
    languages.sort(comp);
    // Populate the language selection menu.
    languageMenu.options.length = 0;
    for (var i = 0; i < languages.length; i++) {
      var tuple = languages[i];
      var lang = tuple[tuple.length - 1];
      var option = new Option(tuple[0], lang);
      if (lang == Code.LANG) {
        option.selected = true;
      }
      languageMenu.options.add(option);
    }
    languageMenu.addEventListener('change', Code.changeLanguage, true);
  }

  if ('MSG' in window) {
    var setText = function(el, text) {
      if (!text) return;
      if (typeof el === 'string') {
        el = document.getElementById(el);
      } else if (Array.isArray(el) || el.length) {
        for (var i = 0; i < el.length; i += 1) {
          setText(el[i], text);
        }
        return;
      }
      if (!el) return;
      var spans = el.getElementsByTagName('span');
      if (spans.length) spans[0].textContent = text;
      else el.textContent = text;
    };
    
    // Inject language strings.
    document.title = MSG['title'];
    setText(document.getElementsByClassName('logo'), MSG['title']);
    
    document.getElementById('tab_blocks_title').textContent = MSG['blocks'];
    
    setText(['btn-load', 'menu-load'], MSG['loadText']);
    setText(['btn-save', 'menu-save'], MSG['saveText']);
    setText(['btn-trash', 'menu-trash'], MSG['trashText']);
    setText(['btn-run', 'menu-run'], MSG['runText']);
    setText('btn-console', MSG['consoleText']);
    setText('menu-browse', MSG['browseText']);
    
    document.getElementById('btn-load').setAttribute('data-tooltip', MSG['loadTooltip']);
    document.getElementById('btn-save').setAttribute('data-tooltip', MSG['saveTooltip']);
    document.getElementById('btn-trash').setAttribute('data-tooltip', MSG['trashTooltip']);
    document.getElementById('btn-run').setAttribute('data-tooltip', MSG['runTooltip']);
    document.getElementById('btn-console').setAttribute('data-tooltip', MSG['consoleTooltip']);

    var categories = ['catLogic', 'catLoops', 'catMath', 'catText', 'catLists',
                      'catColour', 'catVariables', 'catFunctions'];
    for (var i = 0, cat; cat = categories[i]; i++) {
      var el = document.getElementById(cat);
      if (el && MSG[cat]) el.setAttribute('name', MSG[cat]);
    }
    var textVars = document.getElementsByClassName('textVar');
    for (var i = 0, textVar; textVar = textVars[i]; i++) {
      textVar.textContent = MSG['textVariable'];
    }
    var listVars = document.getElementsByClassName('listVar');
    for (var i = 0, listVar; listVar = listVars[i]; i++) {
      listVar.textContent = MSG['listVariable'];
    }
  }
};

Code.alert = function(opt) {
  $('#modal-alert-title').empty().text(opt.title);
  $('#modal-alert-body').empty().append(opt.body);
  var $ok = $('#modal-alert-ok'), $cancel = $('#modal-alert-cancel');
  $ok.text(opt.okText || 'OK');
  if (opt.cancelText === false) {
    $cancel.hide();
  } else {
    $cancel.text(opt.cancelText || 'Cancel').show();
  }
  if (opt.okCallback) {
    $ok.bind('click', function() {
      opt.okCallback();
      $ok.unbind('click');
    });
  }
  if (opt.cancelCallback) {
    $cancel.bind('click', function() {
      opt.cancelCallback();
      $cancel.unbind('click');
    });
  }
  $('#modal-alert').openModal();
};

/**
 * Discard all blocks from the workspace.
 */
Code.discard = function() {
  var count = Blockly.mainWorkspace.getAllBlocks().length;
  if (count < 2 ||
      window.confirm(MSG['discard'].replace('%1', count))) {
    Blockly.mainWorkspace.clear();
    window.location.hash = '';
    return true;
  }
  return false;
};

/**
 * Save all blocks to an XML file.
 */
Code.save = function() {
  var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
  var data = Blockly.Xml.domToText(xml);
  var blob = new Blob([data], {type: 'text/xml'});
  saveAs(blob, 'blocklyduino.xml');
};

/**
 * Load blocks from an XML file.
 */
Code.load = function() {
  var loadFile = document.getElementById("load");
  if (loadFile == null) {
    loadFile = document.createElement('INPUT');
    loadFile.type = 'file';
    loadFile.id = 'load';
    loadFile.style = 'display: none';
    document.body.appendChild(loadFile);
    loadFile.addEventListener('change', function(event) {
      var files = event.target.files;
      if (files.length != 1) return;
      var reader = new FileReader();
      reader.onloadend = function(event) {
        var target = event.target;
        // 2 == FileReader.DONE
        if (target.readyState == 2) {
          var success = Code.loadXml(target.result, function(ok, cancel) {
            Code.alert({
              body: 'Replace or merge existing blocks?',
              okText: 'Replace',
              cancelText: 'Merge',
              okCallback: ok,
              cancelCallback: cancel
            });
          });
          if (success) {
            Code.renderContent();
          } else {
            alert('Error parsing XML');
          }
        }
        // Reset value of input after loading because Chrome will not fire
        // a 'change' event if the same file is loaded again.
        document.getElementById('load').value = '';
      };
      reader.readAsText(files[0]);
    }, false);
  }
  loadFile.click();
};

/**
 * Load blocks from an XML string.
 */
Code.loadXml = function(xml, confirm) {
  var xmlDom;
  try {
    xmlDom = Blockly.Xml.textToDom(xml);
  } catch (e) {
    return false;
  }
  var count = Blockly.mainWorkspace.getAllBlocks().length;
  if (count && (typeof confirm === 'function')) {
    confirm(
      function() { Code.loadXmlDom(xmlDom, true); },
      function() { Code.loadXmlDom(xmlDom, false); }
    );
    return true;
  } else {
    return Code.loadXmlDom(xmlDom, count && (confirm != false));
  }
};
/**
 * Load blocks from an XML DOM.
 */
Code.loadXmlDom = function(xmlDom, clear) {
  if (clear) Blockly.mainWorkspace.clear();
  try {
    Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xmlDom);
  } catch (e) {
    return false;
  }
  return true;
};

// Load the app's language strings.
document.write('<script src="msg/' + Code.LANG + '.js"></script>\n');
// Load Blockly's language strings.
document.write('<script src="../BlocklyDuino/blockly/msg/js/' + Code.LANG + '.js"></script>\n');

window.addEventListener('load', Code.init);
