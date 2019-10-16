Эта страница на [Русском](/docs/ru/readme.md)

# Configuration settings

A typical setting of the _registry_ module in the application configuration file includes the following sections:

- [x] [Setting the display of ES status `"signedClasses"`](/docs/en/additional_settings.md#setting-the-display-of-es-status)
- [x] [Setting resource caching in a browser `"staticOptions"`](/docs/en/additional_settings.md#setting-resource-caching-in-a-browser)
- [x] [Overriding the composition of the system menu for the module `"explicitTopMenu"`](/docs/en/additional_settings.md#overriding-the-composition-of-the-system-menu-for-the-module)
- [x] [Configure preliminary sample loading objects `"eagerLoading"`](/docs/en/additional_settings.md#configure-preliminary-sample-loading-objects)
- [x] [Search object setting `"listSearchMinLength"` and `"listSearchOptions"`](/docs/en/additional_settings.md#search-object-setting)
- [x] [Setting up file storage `"storage"`](/docs/en/additional_settings.md#setting-up-file-storage)
- [x] [Module page by default `"defaultPath"`](/docs/en/additional_settings.md#module-page-by-default)
- [x] [Setting editing objects in the list `"inlineForm"`](/docs/en/additional_settings.md#setting-editing-objects-in-the-list)
- [x] [Setting the application system menu `"navigation"`](/docs/en/additional_settings.md#setting-the-application-system-menu)
- [x] [Defining a path to templates `"templates"`](/docs/en/additional_settings.md#defining-a-path-to-templates)
- [x] [External icon integration `"statics"`](/docs/en/additional_settings.md#external-icon-integration)
- [x] [Setting a unique icon for the module page `"logo"`](/docs/en/additional_settings.md#setting-a-unique-icon-for-the-module-page)
- [x] Setting up executable jobs `"di"`:
 - [Export in printed form](/docs/en/additional_settings.md#export-in-printed-form)
 - [Utility setting](/docs/en/additional_settings.md#utility-setting)
 - [Setting up additional actions on the form](/docs/en/additional_settings.md#setting-up-additional-actions-on-the-form)
 - [Creating a predefined array of objects](/docs/en/additional_settings.md#creating-a-predefined-array-of-objects)
 - [Setting a hierarchical view for collections](/docs/en/additional_settings.md#setting-a-hierarchical-view-for-collections)
 - [Setting integration with OwnCloud when working with files](/docs/en/additional_settings.md#setting-integration-with-owncloud-when-working-with-files)
 - [Setting integration with OwnCloud when working with collection of files](/docs/en/additional_settings.md#setting-integration-with-owncloud-when-working-with-collection-of-files)


The structure of the sections is as follows:

```javascript
"registry": {
    "globals": {
        "signedClasses": [...],
        "staticOptions": {...},
        "explicitTopMenu": [...],
        "eagerLoading": {...},
        "listSearchMinLength": ...,
        "listSearchOptions": {...},
        "storage": {...},
        "defaultPath": "...",
        "inlineForm": true,
        "navigation": {...},
        "templates": [...],
        "customTemplates": [...],
        "statics": {...},
        "logo": "...",
        "di": {
          "pmItemToExcel": {...},
          "export": {...},
          "nameUtil": {...},
          "actions": {...},
          "collectionsCreator": {...},
          "treegridController": {...},
          "fileshareController": {...},
          "fileCollectionController": {...}
        }
      }
    }
```

## Setting the display of ES status

Add the `"signedClasses"` setting to To request and display the status of electronic signatures (ES). In this property you need to list the classes in which you want to display this status. [Read more about EDS settings](https://github.com/iondv/framework/blob/master/docs/en/2_system_description/functionality/eds.md).

```javascript
"signedClasses": [
  "nameClass@namespaceApp"
]
```

## Setting resource caching in a browser

The setting can exclude from the check files that have already been received on the server when accessing the registry module page.
The static files from the cache are displyed. For the "maxAge" property, we set caching in milliseconds.

```javascript
"staticOptions": {
  "maxAge": 3600000
}
```

```
NB. It is activated only with "NODE_ENV = production"
```

## Overriding the composition of the system menu for the module

The system menu is set in the global configuration settings. But there is an opportunity to redefine the composition of the system menu for the page of each module. Specify the system names of the necessary menu items in the `"explicitTopMenu"` property in the module configuration settings:

```javascript
"explicitTopMenu": [
  "nameNavigation", //navigation item, which is part of the system menu of the registry module page
  { // the transition from the system menu item to this module page
    "type": "system",
    "name": "nameModule"
  }
]
```

## Configure preliminary sample loading objects

It allows you to specify related objects that need to be loaded in order to correctly display their semantics when performing operations on the main object (viewing information in the object’s card, displaying a list of objects, exporting information about the object to a printed form). [Read more about prefetching download objects](https://github.com/iondv/framework/blob/master/docs/ru/2_system_description/metadata_structure/meta_class/eager_loading.md). It is set for the class of the main object.

```javascript
"eagerLoading": {
  "*": { // all object types
    "nameClass@namespaceApp": { // main object class
      "item": [
        "nameAttr.nameAttr2.nameAttr3" // path to the related object for correct display on the edit form
      ],
      "list": [
        "nameAttr.nameAttr2.nameAttr3" // path to the related object for correct display on the list form
      ],
      "exportItem": [
        "nameAttr.nameAttr2.nameAttr3" // path to the related object for correct display on the edit form
      ]
    }
  }
}
```

## Search object setting

The functional allows to determine the search for class objects from the list view: by the occurrence of words or complete words, by individual attributes or by the specified attributes in the list with search parameters separated by spaces.

```javascript
"listSearchMinLength": 3, // minimum number of characters in the search string for query
"listSearchOptions": {
  "nameClass@namespaceApp": { //the class for the objects of which you want to configure the search
    "*": { // everywhere by default
      "searchBy": [ // class attributes by the value of which the search will be performed
        "nameAttr"
      ],
      "mode": [ // matching modes - in this case "starts with" (available: like, contains, starts, ends)
        "starts"
      ],
      "minLength": 1 // minimum number of characters to search for objects of a particular class
    }
  }
}
```

## Setting up file storage

The setting allows you to specify the path to store the file in the "OwnCloud" storage:

```javascript
"storage": {
  "nameClass@namespaceApp": {
    "cloudFile": "/${class}/ns_${attr}/${dddd}/",
    "resultCloudFile": "/${class}/ns_${attr}/${dddd}/"
  }
}
```
where `"cloudFile"` and `"resultCloudFile"` - attributes of the file type of the `"nameClass@namespaceApp"` class.

## Module page by default

After going to the registry module page, it is possible to open the page specified in the `"defaultPath"` property by default.

```javascript
"defaultPath": "nameModule"
```

## Setting editing objects in the list

The standard mechanism for changing attribute values is as follows: _it is necessary to open the editing form of the object, make the necessary changes, and save the changes_. The `"inlineForm"` setting allows you to change attribute values not only on the editing form of the object, but also in the list of objects.

```javascript
"inlineForm": true
```

## Setting the application system menu

```javascript
"navigation": {
  "namespaces": {
    "namespaceApp": "Application" // application namespace
  },
  "menus": {
    "top": [ // navigation type
      "namespaceApp@nameNavigation" // listing items
    ]
  }
}
```
`"top"` - System menu items. Navigation sections items that will be located at the top of the module page.
`"left"` - Side menu items. Navigation sections items that will be located on the left side of the module page.

## Defining a path to templates

The path to the folder containing additional application settings to use in the registry module is specified. The path is relative to the platform.
```javascript
"templates": [
  "applications/namespaceApp/templates/registry"
]
```

## External icon integration

In the application, you need to specify a directory containing static files that the server will give. Do it as follows:
```javascript
"statics": {
  "common-static": "applications/namespaceApp/templates/registry/static"
}
```

## Setting a unique icon for the module page

The icon will be displayed in the upper left corner of the module page. The path to the icon consists of a static template variable defined in the "statics" section and in the file name.
```javascript
"logo": "common-static/logo.png",
```

## Setting up executable jobs

In the `"di"` section of the module configuration settings, executable tasks are set. A description of the tasks is below in the form of subitems.

### Export in printed form

The printing form (abbreviated as PF) is a document of the .docx/.xlsx format, into which data is exported from the object forms according to the specified template. [Read more about setting PF](https://github.com/iondv/framework/blob/master/docs/en/2_system_description/functionality/printed_forms.md)

The setting is set in 2 stages. **First** - you need to set export options.

```javascript
"pmItemToDocx": { // export template, indicates the format of the document
  "module": "modules/registry/export/itemToDocx", // path to the export settings template in a ".docx" format document
  "initMethod": "init", // method
  "initLevel": 0,
  "options": { 
    "tplDir": "applications/namespaceApp/export/item", // path to the folder containing the PF template in the application
    "injectors": []
  }
}
```

**Second** - you need to set the PF parameters.
```javascript
"export": {
  "options": {
    "configs": {
      "nameClass@namespaceApp": { // class on the form of which export to PF will be performed
        "namePrintedForms": { // PF system name
          "caption": "PF name",
          "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "extension": "docx", // PF format
          "type": "item", // type of view form of the object with which export to the PF will be carried out
          "params": { // PF parameters (if available)
            "periodYYYY": { // when you select the "Export" action, a window opens for choosing a period
              "caption": "Год",
              "type": "string"
            }
          },
          "preprocessor": "ion://pmItemToDocx", // export template specified
          "eagerLoading": [ // attributes that require additional loading to display values correctly
            "nameAttr"
          ],
          "fileNameTemplate": "Наименование ПФ.${item.name}", // export file names
          "isBackground": true // indicates the ability to export PF in the background
        }
      }
    }
  }
}
```

### Utility setting

Utility - is a program that launches a preassigned process in an application whose settings are in a separate file. Such files are located in the `"applications/namespaceApp/lib"` folder. [Read more about purpose and configuration of utilities](https://github.com/iondv/framework/blob/master/docs/en/2_system_description/functionality/utilities.md). The utility configuration setting is as follows:
```javascript
"nameUtil": { // system name of the utility
  "module": "applications/namespaceApp/lib/actions/nameUtil", // path to utility settings
  "initMethod": "init", // method
  "initLevel": 2,
  "options": { // static options of any utility
    "data": "ion://securedDataRepo",
    "workflows": "ion://workflows",
    "log": "ion://sysLog",
    "changelogFactory": "ion://changelogFactory",
    "state": "start" // the condition under which the utility is available (if available)
  }
}
```

### Setting up additional actions on the form

It is used when it is necessary to add an additional action to the form in order to run the utility, in addition to [standart ones](https://github.com/iondv/framework/blob/master/docs/en/2_system_description/metadata_structure/meta_view/commands.md). For the `"actions"` property, you need to register the action code that launches the utility, for example:
```javascript
"actions": {
  "options": {
    "actions": [
      {
        "code": "CREATE_NEW_VALUE",
        "handler": "ion://nameUtil" // utility specification
      }
    ]
  }
}
```

### Creating a predefined array of objects

It allows you to specify a template by which objects will be created in the collection on the form when moving through the statuses of a work-flow (WF). A process based on `collectionCreator` utility starts. The configuration setting consists of standard utility settings (the description of which is above) and listing the templates to create objects in the collection in the `"map"` section.

```javascript
"collectionsCreator": {
  "module": "applications/namespaceApp/lib/util/collectionCreator",
  "initMethod": "init",
  "initLevel": 2,
  "options": {
    "data": "ion://securedDataRepo",
    "workflows": "ion://workflows",
    "log": "ion://sysLog",
    "changelogFactory": "ion://changelogFactory",
    "calc": "ion://calculator",
    "map": {
      "nameWorkflow@namespaceApp:state": { // The WF status to process creation of objects 
        "nameClass@namespaceApp": { // objects are created in the collection on the form of an object of what class
          "nameAttr": { // collection attribute name
            "elementClass": "nameClassAttr@namespaceApp", //  class objects which are created in the collection
            "patterns": [
              {
                "values": { // attribute values for created objects
                  "nameAttr1": "string", // string
                  "nameAttr2": 123, // number
                  "nameAttr3": true,
                  "nameAttr4": "$containerProperty1", // container property
                  "nameAttr5": {"add": ["$containerProperty2", 300]} // formula
                },
                "push": [
                  "nameWorkflow2@namespaceApp.close" // WF status assignment
                ]
              }
            ]
          }
        }
      }
    }
  }
}
```

### Setting a hierarchical view for collections

**Hierarchical view for collections** - displays collections in which items are linked together in a hierarchical catalog. The `viewlib-extra` library implements a functional that returns the next hierarchy level in the `TreeGrid` format.
```javascript
"treegridController": {
  "module": "applications/viewlib-extra/lib/controllers/api/treegrid", // viewlib-extra library template path
  "initMethod": "init",
  "initLevel": 0,
  "options": { // hierarchy setting
    "module": "ion://module",
    "logger": "ion://sysLog",
    "dataRepo": "ion://securedDataRepo",
    "metaRepo": "ion://metaRepo",
    "auth": "ion://auth",
    "config": {
      "*": { // applies to all navigation nodes
        "nameClass@namespaceApp": {
          "roots": [ // enumeration of class attributes used as root (conditions are used)
            {
              "property": "name",
              "operation": 1,
              "value": [
                null
              ],
              "nestedConditions": []
            }
          ],
          "childs": [ // enumeration of class attributes to build a hierarchy
            "classAttr"
          ]
        }
      }
    }
  }
}
```

### Setting integration with OwnCloud when working with files

Documentation on setting up and working with application files is available at [link](https://github.com/iondv/framework/blob/master/docs/ru/2_system_description/metadata_structure/meta_view/fileshare.md). The configuration setting is set as follows:
```javascript
"fileshareController": { // viewlib library template name
  "module": "applications/viewlib/lib/controllers/api/fileshare", // viewlib library template path
  "initMethod": "init",
  "initLevel": 0,
  "options": {
    "module": "ion://module",
    "fileStorage": "ion://fileStorage"
  }
}
```

### Setting integration with OwnCloud when working with collection of files

By the same principle as "OwnCloud interaction settings when working with files"
```javascript
"fileCollectionController": {
  "module": "applications/viewlib/lib/controllers/api/file-collection",
  "initMethod": "init",
  "initLevel": 0,
  "options": {
    "module": "ion://module",
    "fileStorage": "ion://fileStorage"
  }
}
```
