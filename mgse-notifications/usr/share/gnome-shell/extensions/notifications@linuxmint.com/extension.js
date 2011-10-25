const StatusIconDispatcherOrig = imports.ui.statusIconDispatcher;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const Signals = imports.signals;
const Config = imports.misc.config;
const versionCheck = imports.ui.extensionSystem.versionCheck;
const PanelMenu = imports.ui.panelMenu;
const Shell = imports.gi.Shell;

const STANDARD_TRAY_ICON_IMPLEMENTATIONS = imports.ui.statusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS;
const PANEL_ICON_SIZE = imports.ui.panel.PANEL_ICON_SIZE

function StatusIconDispatcher() {
    this._init();
}

StatusIconDispatcher.prototype = {
    _init: StatusIconDispatcherOrig.StatusIconDispatcher.prototype._init,

    start: StatusIconDispatcherOrig.StatusIconDispatcher.prototype.start,

    _onTrayIconAdded: function(o, icon) {
        let wmClass = (icon.wm_class || 'unknown').toLowerCase();
        let role = STANDARD_TRAY_ICON_IMPLEMENTATIONS[wmClass];
        if (role) {
	    Main.panel._onTrayIconAdded(o, icon, role);
        } else {
            role = wmClass;
	    Main.panel._onTrayIconAdded(o, icon, role);
	}
    },

    _onTrayIconRemoved: function(o, icon) {
	Main.panel._onTrayIconRemoved(o, icon);
    }
};
Signals.addSignalMethods(StatusIconDispatcher.prototype);

let clock;

function init() {
    clock = Main.panel._dateMenu;
}

function enable(meta) {
    Main.statusIconDispatcher = new StatusIconDispatcher();
	
    Main.statusIconDispatcher.start(Main.messageTray.actor);
    for ( let i = 0; i < Main.messageTray._summaryItems.length; i++ ) {
        icon = Main.messageTray._summaryItems[i].source._trayIcon;
    
        // adjust icon height to new panel's one
        icon.height = PANEL_ICON_SIZE;

        // move icon to (the old named) traybox
        icon.reparent(Main.panel._rightBox);
        Main.panel._rightBox.move_child(icon, 0)

        // add a container for the icon in order to get it "padded"
        let buttonBox = new PanelMenu.ButtonBox();
        let box = buttonBox.actor;

        // position the container aswell
        let position = 0;
        let children = Main.panel._rightBox.get_children();
        let i;
        for (i = children.length - 1; i >= 0; i--) {
            let rolePosition = children[i]._rolePosition;
            if (position > rolePosition) {
                Main.panel._rightBox.insert_actor(box, i + 1);
                break;
            }
        }
        if (i == -1) {
            // If we didn't find a position, we must be first
            Main.panel._rightBox.insert_actor(box, 0);
        }
        box._rolePosition = position;
        box.add_actor(icon);
        icon.reparent(box);        
    }

    Main.panel._rightBox.show();
    
    Main.messageTray._summary.destroy_children();
    
    /* Move Clock to the right */
    let _children = Main.panel._rightBox.get_children();    
    Main.panel._centerBox.remove_actor(clock.actor);
    Main.panel._rightBox.insert_actor(clock.actor, _children.length-1);
}

function disable() {
    Main.statusIconDispatcher = StatusIconDispatcherOrig;
    Main.statusIconDispatcher.start(Main.messageTray.actor);
    
    // Place back the clock   
    Main.panel._rightBox.remove_actor(clock.actor); 
    Main.panel._centerBox.add_actor(clock.actor); 
}
