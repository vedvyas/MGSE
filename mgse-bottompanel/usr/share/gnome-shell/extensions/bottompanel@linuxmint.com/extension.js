/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
/* Trying to follow style conventions of previous authors */

const Gio = imports.gi.Gio;
const MessageTray = imports.ui.messageTray;
const WindowManager = imports.ui.windowManager;
const St = imports.gi.St;
const Meta = imports.gi.Meta;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
const Tweener = imports.ui.tweener;

// Autohide adapted from fpmurphy's autohidetopbar extension, specifically
// port to GS 3.2 by Kevin Kane and Carlo Marchiori
const AUTOHIDE_ANIMATION_TIME = 0.4;

// Enable/disable some logging (0 == off, otherwise on)
const DEBUG = 0;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

function DEBUGLOG(msg) {
    if (DEBUG != 0) {
        global.log('bottompanel: ' + msg);
    }
}

function MessageButton() {
    this._init();
}

MessageButton.prototype = {
    _init: function() {
        this.actor = new St.Button({ name: 'messageButton',
                                     style_class: 'message-button',
                                     reactive: true });
        this.messageLabel = new St.Label({ text: '!' });
        this.actor.set_child(this.messageLabel);
        this.actor.connect('clicked', Lang.bind(this, function() {
            Main.messageTray.toggleState();
        }));
    }
};

function WorkspaceSwitcher() {
    this._init();
}

WorkspaceSwitcher.prototype = {
    _init: function() {
        this.actor = new St.BoxLayout({ name: 'workspaceSwitcher',
                                        style_class: 'workspace-switcher',
                                        reactive: true });
        this.actor.connect('button-release-event', this._showDialog);
        this.actor._delegate = this;
        this.button = [];
        this._createButtons();

        global.screen.connect('notify::n-workspaces',
                                Lang.bind(this, this._createButtons));
        global.window_manager.connect('switch-workspace',
                                Lang.bind(this, this._updateButtons));
    },

    _createButtons: function() {
        for ( let i=0; i<this.button.length; ++i ) {
            this.button[i].destroy();
        }

        this.button = [];
        for ( let i=0; i<global.screen.n_workspaces; ++i ) {
            this.button[i] = new St.Button({ name: 'workspaceButton',
                                     style_class: 'workspace-button',
                                     reactive: true });
            let text = '';
            if ( i == global.screen.get_active_workspace_index() ) {
                text = '-' + (i+1).toString() + '-';
                this.button[i].add_style_pseudo_class('outlined');
            }
            else {
                text = (i+1).toString();
            }
            let label = new St.Label({ text: text });
            this.button[i].set_child(label);
            this.actor.add(this.button[i]);
            let index = i;
            this.button[i].connect('clicked', Lang.bind(this, function() {
                let metaWorkspace = global.screen.get_workspace_by_index(index);
                metaWorkspace.activate(global.get_current_time());
            }));
        }
    },

    _updateButtons: function() {
        for ( let i=0; i<this.button.length; ++i ) {
            if ( i == global.screen.get_active_workspace_index() ) {
                this.button[i].get_child().set_text('-' + (i+1).toString() + '-');
                this.button[i].add_style_pseudo_class('outlined');
            }
            else {
                this.button[i].get_child().set_text((i+1).toString());
                this.button[i].remove_style_pseudo_class('outlined');
            }
        }
    },

    _showDialog: function(actor, event) {
        let button = event.get_button();
        if ( button == 3 ) {
            if ( this._workspaceDialog == null ) {
                this._workspaceDialog = new WorkspaceDialog();
            }
            this._workspaceDialog.open();
            return true;
        }
        return false;
    }
};

function BottomPanel() {
    this._init();
}

BottomPanel.prototype = {
    _init : function() {
        this.actor = new St.BoxLayout({ style_class: 'bottom-panel',
                                        name: 'bottomPanel',
                                        reactive: true });
        this.actor._delegate = this;
        this.autohide = false;
        this.last_click_time = 0;
        this.hidden = false;
        this.referenceY = 0;
        this.doubleClickTimeout = 1000;
        this.mouseSettings = 
            new Gio.Settings({ schema: 'org.gnome.settings-daemon.peripherals.mouse' });
        
        this.leftBox = new St.BoxLayout({ reactive: true });
        this.actor.add(this.leftBox, { expand: true, y_fill: false });

        let workspaceSwitcher = new WorkspaceSwitcher();
        this.actor.add(workspaceSwitcher.actor, { y_fill: false });

        let messageButton = new MessageButton();
        this.actor.add(messageButton.actor);
        
        // We'll turn this off when autohiding
        Main.layoutManager.addChrome(this.actor, { affectsStruts: true });
        
        // Follow changes to system double-click timeout
        this.mouseSettings.connect(
            'changed::double-click',
            Lang.bind(this, 
                      function() {
                          this.doubleClickTimeout = 
                              this.mouseSettings.get_int('double-click');
                          DEBUGLOG('Updated double-click to ' + 
                                   this.doubleClickTimeout);
                      }));
        
        // Check for double-clicks to toggle use of autohide
        this.actor.connect('button-release-event', 
                           Lang.bind(this, this.checkToggleAutohide));

        this.actor.connect('style-changed', Lang.bind(this, this.relayout));
        this.actor.connect('enter-event', Lang.bind(this, this.showpanel));
        this.actor.connect('leave-event', Lang.bind(this, this.hidepanel));
        global.screen.connect('monitors-changed', Lang.bind(this,
                                                     this.relayout));
    },

    checkToggleAutohide: function(actor, event)
    {
        DEBUGLOG('Something happened at ' + event.get_time());
        DEBUGLOG(event);

        DEBUGLOG('Double-click timeout is ' + this.doubleClickTimeout);
        
        // Check for two successive clicks within timeout period
        let current_time = event.get_time();

        if (this.last_click_time == 0)
        {
            this.last_click_time = current_time;
            return;
        }
        else if ((current_time - this.last_click_time) > this.doubleClickTimeout)
        {
            this.last_click_time = 0;
            return 0;
        }
        
        this.last_click_time = 0;
        
        this.toggleAutohide();
    },
    
    toggleAutohide: function() {
        if (this.autohide == true) {
            this.autohide = false;
            Main.layoutManager.removeChrome(this.actor) ;
            Main.layoutManager.addChrome(this.actor, { affectsStruts: true });
        }
        else {
            this.autohide = true;
            Main.layoutManager.removeChrome(this.actor) ;
            Main.layoutManager.addChrome(this.actor, { affectsStruts: false });
        }
        
        DEBUGLOG("Set autohide status to " + this.autohide);
    },

    showpanel: function() {
        if (this.autohide == true && this.hidden == true) {
            let primary = Main.layoutManager.primaryMonitor;

            let h = this.actor.get_theme_node().get_height();
            
		        Tweener.addTween(this.actor,
		                         { y: primary.y+primary.height-h,
		                           time: AUTOHIDE_ANIMATION_TIME + 0.1,
		                           transition: 'easeOutQuad'
		                         });
            
		        Tweener.addTween(this.actor,
		                         { opacity: 255,
		                           time: AUTOHIDE_ANIMATION_TIME+0.2,
		                           transition: 'easeOutQuad'
		                         });

            this.hidden = false;
        }
    },

    hidepanel: function() {
        if (this.autohide == true && this.hidden == false) {
            let primary = Main.layoutManager.primaryMonitor;

            Tweener.addTween(this.actor,
		                         { y: primary.y+primary.height-5,
		                           time: AUTOHIDE_ANIMATION_TIME,
		                           transition: 'easeOutQuad'
		                         });

		        Tweener.addTween(this.actor,
		                         { opacity: 0,
		                           time: AUTOHIDE_ANIMATION_TIME-0.1,
		                           transition: 'easeOutQuad'
		                         });

            this.hidden = true;
        }
    },

    relayout: function() {
        let primary = Main.layoutManager.primaryMonitor;

        let h = this.actor.get_theme_node().get_height();
        this.actor.set_position(primary.x, primary.y+primary.height-h);
        this.actor.set_size(primary.width, -1);
    },
    
    moveMe: function(item) {
        item.actor.get_parent().remove_actor(item.actor);
        
        if (item==Main.panel._mintMenu) {
            this.leftBox.insert_actor(item.actor, 0);
        }
        else if (item==Main.panel._mintWindowList) {
            let _children = this.leftBox.get_children(); 
            this.leftBox.insert_actor(item.actor, _children.length);
        }
        else {
            this.leftBox.add(item.actor);
        }
        
        if (item==Main.panel._mintMenu || item==Main.panel._mintWindowList) item.setBottomPosition(true);
    }
};

let origShowTray;
let myShowTray;
let origShowWorkspaceSwitcher;
let myShowWorkspaceSwitcher;

function init(extensionMeta) {
    let localePath = extensionMeta.path + '/locale';

    origShowTray = MessageTray.MessageTray.prototype._showTray;
    myShowTray = function() {
        let h = bottomPanel.actor.get_theme_node().get_height();
        if (bottomPanel.hidden == true) 
        {
            h = 0;
        }
        this._tween(this.actor, '_trayState', MessageTray.State.SHOWN,
                    { y: - this.actor.height - h,
                      time: MessageTray.ANIMATION_TIME,
                      transition: 'easeOutQuad'
                    });
    };

    MessageTray.MessageTray.prototype.toggleState = function() {
        if (this._summaryState == MessageTray.State.SHOWN) {
            this._pointerInSummary = false;
        }
        else {
            this._pointerInSummary = true;
        }
        this._updateState();
    };

    origShowWorkspaceSwitcher =
        WindowManager.WindowManager.prototype._showWorkspaceSwitcher;
    
    myShowWorkspaceSwitcher = function(shellwm, binding, mask, window, backwards) {
        if (global.screen.n_workspaces == 1)
            return;

        //if (this._workspaceSwitcherPopup == null)
        //    this._workspaceSwitcherPopup = new WorkspaceSwitcherPopup.WorkspaceSwitcherPopup();

        if (binding == 'switch_to_workspace_up')
            this.actionMoveWorkspaceUp();
        else if (binding == 'switch_to_workspace_down')
            this.actionMoveWorkspaceDown();
        // left/right would effectively act as synonyms for up/down if we enabled them;
        // but that could be considered confusing.
        else if (binding == 'switch_to_workspace_left')
           this.actionMoveWorkspaceLeft();
        else if (binding == 'switch_to_workspace_right')
           this.actionMoveWorkspaceRight();
    };

    WindowManager.WindowManager.prototype._reset = function() {
        this.setKeybindingHandler('switch_to_workspace_left', Lang.bind(this, this._showWorkspaceSwitcher));
        this.setKeybindingHandler('switch_to_workspace_right', Lang.bind(this, this._showWorkspaceSwitcher));
        this.setKeybindingHandler('switch_to_workspace_up', Lang.bind(this, this._showWorkspaceSwitcher));
        this.setKeybindingHandler('switch_to_workspace_down', Lang.bind(this, this._showWorkspaceSwitcher));

        this._workspaceSwitcherPopup = null;
    };
}

let bottomPanel = null;

function enable() {
    global.screen.override_workspace_layout(Meta.ScreenCorner.TOPLEFT, false, 1, -1);

    MessageTray.MessageTray.prototype._showTray = myShowTray;
    WindowManager.WindowManager.prototype._showWorkspaceSwitcher =
        myShowWorkspaceSwitcher;

    Main.wm._reset();

    bottomPanel = new BottomPanel();
    bottomPanel.relayout();
    
    /* Look for the menu */
    if (Main.panel._mintMenu != null) {
        bottomPanel.moveMe(Main.panel._mintMenu);
        global.log("mintPanel found mintmenu");
    }
    
    /* Look for the show desktop button */
    if (Main.panel._mintShowDesktopButton != null) {
        bottomPanel.moveMe(Main.panel._mintShowDesktopButton);
        global.log("mintPanel found mintShowDesktopButton");
    }
    
    /* Look for the window list */
    if (Main.panel._mintWindowList != null) {
        bottomPanel.moveMe(Main.panel._mintWindowList);
        global.log("mintPanel found mintWindowList");
    }
    
    /* Tell the main panel we're here */
    Main.panel._mintPanel = bottomPanel;
}

function disable() {
    global.screen.override_workspace_layout(Meta.ScreenCorner.TOPLEFT, false, -1, 1);

    MessageTray.MessageTray.prototype._showTray = origShowTray;
    WindowManager.WindowManager.prototype._showWorkspaceSwitcher =
        origShowWorkspaceSwitcher;

    Main.wm._reset();

    if ( bottomPanel ) {
        Main.layoutManager.removeChrome(bottomPanel.actor);
        bottomPanel = null;
    }
}
