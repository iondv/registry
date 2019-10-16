This page in [Russian](/README_RU.md)

# IONDV. Registry

<h1 align="center"> <a href="https://www.iondv.com/"><img src="/registry.png" alt="IONDV. Registry" align="center"></a>
</h1>  

**Registry** - is an IONDV. Framework module. It's a central module designed specifically for working with data based on metadata structures, provides maintenance and display of data in the form of a registry.

### IONDV. Framework in brief

**IONDV. Framework** - is a node.js open source framework for developing accounting applications
or microservices based on metadata and individual modules. Framework is a part of 
instrumental digital platform to create enterprise 
(ERP) apps. This platform consists of the following open-source components: the [IONDV. Framework](https://github.com/iondv/framework), the
[modules](https://github.com/topics/iondv-module) и ready-made applications expanding it
functionality, visual development environment [Studio](https://github.com/iondv/studio) to create metadata for the app.

* For more details, see [IONDV. Framework site](https://iondv.com). 

* Documentation is available in the [Github repository](https://github.com/iondv/framework/blob/master/docs/en/index.md).

## Description

The main application module is designed to display control objects on the registry page:
navigation, view forms, filters, work-flows and other sections of the module.

Properties and settings of control objects for display to the module page are set by the application metadata and include:

- [x] creating classes and their attributes;
- [x] creating navigation;
- [x] creating views for classes;
- [x] creating work-flows;
- [x] creating templates for applying advanced functionality by connecting related libraries;
- [x] creating utilities to run any processes or job on a schedule;
- [x] creating of texts for notifications, customizable in the configuration file - deploy.json. 

## Module features

- hierarchical display of navigation;
- displaying lists of data objects according to navigation conditions, filters, search results;
- the ability to create objects;
- display of unified forms of objects with the ability to edit, delete, modify work-flows, implement the conditions for displaying and overloading the presentation of a form in a business process;
- display of various types of attributes, including related in the form of tables or links, geo objects (including search for coordinates by address);
- display of data on their semantics (conditions for changes);
- the ability to change the display and interaction with the attributes of objects through custom HTML templates that receive data by REST-API;
- preparation of printed forms in docx and xlsx format based on lists or object data;
- display of user notifications;
- the ability to implement your own action buttons with server data processing.

## Intended use of the module using demo projects as an example

_Registry_ module is used in pm-gov-ru.iondv.com demo project.

* **[telecom-ru.iondv.com](https://telecom-ru.iondv.com/geomap) project (russian version), [telecom-en.iondv.com](https://telecom-en.iondv.com/geomap) project (english version)** - is an application to account, store, and present the data on the availability of communication services (Internet, mobile communications, television, mail, etc.) in populated areas of the region. 
* **[pm-gov-ru.iondv.com](https://pm-gov-ru.iondv.com/geomap) project** - is a registry type software solution for organizing public sector project activities.  

The _Registry_ module page contains system menu items located at the top of the module page. and displaying the main accounting objects of the system. When you go to any of the items on the system menu, a navigation opens the objects of the system by the navigation items. These objects represents a description of the accounting objects of the system.

As a result, all accounting objects of the system are organized in the form of a list for navigation items. You can edit or view detailed information on the accounting object in the object card by opening it from the list.


--------------------------------------------------------------------------  


 #### [Licence](/LICENSE) &ensp;  [Contact us](https://iondv.com/portal/contacts) &ensp;  [Russian](/docs/ru/readme.md)   &ensp;           


--------------------------------------------------------------------------  

Copyright (c) 2018 **LLC "ION DV"**.  
All rights reserved. 