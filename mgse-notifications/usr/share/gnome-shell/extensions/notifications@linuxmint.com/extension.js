const StatusIconDispatcher = imports.ui.statusIconDispatcher;
const Main = imports.ui.main;

let clock;

function init(extensionMeta) {
    clock = Main.panel._dateMenu;
}

function enable() {
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['dropbox'] = 'dropbox';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['mintUpdate.py'] = 'mintUpdate.py';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['mintUpdate'] = 'mintUpdate';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['file-uploader.py'] = 'file-uploader.py';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['Skype'] = 'Skype';
    
    /* Move Clock to the right */
    let _children = Main.panel._rightBox.get_children();    
    Main.panel._centerBox.remove_actor(clock.actor);
    Main.panel._rightBox.insert_actor(clock.actor, _children.length-1);
}

function disable() {
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['dropbox'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['mintUpdate.py'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['mintUpdate'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['file-uploader.py'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['Skype'] = '';
    
    // Place back the clock   
    Main.panel._rightBox.remove_actor(clock.actor); 
    Main.panel._centerBox.add_actor(clock.actor); 
}
