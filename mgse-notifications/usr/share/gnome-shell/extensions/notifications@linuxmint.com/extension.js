const StatusIconDispatcher = imports.ui.statusIconDispatcher;

function init(extensionMeta) {}

function enable() {
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['dropbox'] = 'dropbox';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['mintUpdate.py'] = 'mintUpdate.py';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['mintUpdate'] = 'mintUpdate';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['file-uploader.py'] = 'file-uploader.py';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['Skype'] = 'Skype';
}

function disable() {
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['dropbox'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['mintUpdate.py'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['mintUpdate'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['file-uploader.py'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['Skype'] = '';
}
