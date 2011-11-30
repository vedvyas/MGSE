/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const Signals = imports.signals;
const Gtk = imports.gi.Gtk;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const ModalDialog = imports.ui.modalDialog;
const Clutter = imports.gi.Clutter;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

function PopupMenuItem(label, icon, callback) {
    this._init(label, icon, callback);
}

PopupMenuItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function(text, icon, callback) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this);

        this.icon = new St.Icon({ icon_name: icon,
                                  icon_type: St.IconType.FULLCOLOR,
                                  style_class: 'popup-menu-icon' });
        this.addActor(this.icon);
        this.label = new St.Label({ text: text });
        this.addActor(this.label);

        this.connect('activate', callback);
    }
};

function TrashManager () {
    this._init();
}

TrashManager.prototype = {
    
    _init: function() {
        this._trash_file = Gio.file_new_for_uri('trash:///');
        this._trash_monitor = this._trash_file.monitor_directory(0, null, null);
        this._trash_monitor.connect('changed', Lang.bind(this, this._onTrashChanged));
        
        this._is_empty = false;
        
        this._onTrashChanged();
    },
    
    is_empty: function() {
        return this._is_empty;
    },
    
    open: function() {
        Gio.app_info_launch_default_for_uri("trash:///", null);
    },
    
    empty: function() {
        let children = this._trash_file.enumerate_children('*', 0, null, null);
        var child_info;
        while ((child_info = children.next_file(null, null)) != null) {
            let child = this._trash_file.get_child(child_info.get_name());
            child.delete(null);
        }
    },
    
    _onTrashChanged: function(){
        let children = this._trash_file.enumerate_children('*', 0, null, null);
        this._is_empty = (children.next_file(null, null)==null);
        this.emit("changed");
    }
}
Signals.addSignalMethods(TrashManager.prototype);

function ConfirmEmptyTrashDialog(emptyMethod) {
    this._init(emptyMethod);
}

ConfirmEmptyTrashDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,

    _init: function(emptyMethod) {
        ModalDialog.ModalDialog.prototype._init.call(this, { styleClass: null });

        let mainContentBox = new St.BoxLayout({ style_class: 'polkit-dialog-main-layout', vertical: false });
        this.contentLayout.add(mainContentBox, { x_fill: true, y_fill: true });

        let messageBox = new St.BoxLayout({ style_class: 'polkit-dialog-message-layout', vertical: true });
        mainContentBox.add(messageBox, { y_align: St.Align.START });

        this._subjectLabel = new St.Label({ style_class: 'polkit-dialog-headline', text: _("Empty Trash?") });

        messageBox.add(this._subjectLabel, { y_fill:  false, y_align: St.Align.START });

        this._descriptionLabel = new St.Label({ style_class: 'polkit-dialog-description', text: _("Are you sure you want to delete all items from the trash?") });

        messageBox.add(this._descriptionLabel, { y_fill:  true, y_align: St.Align.START });

        this.setButtons([
        {
            label: _("Cancel"),
            action: Lang.bind(this, function() {
                this.close();
            }),
            key: Clutter.Escape
        },
        {
            label: _("Empty"),
            action: Lang.bind(this, function() {
                this.close();
                emptyMethod();
            })
        }
        ]);
    }
};

function TrashButton () {
    this._init();
}

TrashButton.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,
    
    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, 'user-trash');
        
        this._trash_manager = new TrashManager();
        this._trash_manager.connect("changed", Lang.bind(this, this._onTrashChanged));
        
        this._open_item = new PopupMenuItem(_('Open Trash'), Gtk.STOCK_OPEN, Lang.bind(this._trash_manager, this._trash_manager.open));
        this.menu.addMenuItem(this._open_item);
        
        this._empty_item = new PopupMenuItem(_('Empty Trash'), Gtk.STOCK_REMOVE, Lang.bind(this, this.empty_trash));
        this.menu.addMenuItem(this._empty_item);
        if (this._trash_manager.is_empty()) this._empty_item.actor.hide();
    },
    
    _onTrashChanged: function(){
        if (this._trash_manager.is_empty()) this._empty_item.actor.hide();
        else this._empty_item.actor.show();
    },
    
    empty_trash: function() {
        try{
        new ConfirmEmptyTrashDialog(Lang.bind(this._trash_manager, this._trash_manager.empty)).open();
        }catch(e){global.log(e);}
    }
}

var trashButton;

function enable() {
    trashButton = new TrashButton();
    Main.panel.addToStatusArea('trash', trashButton);
}

function disable() {
    trashButton.destroy();
}

function init(metadata) {
}

