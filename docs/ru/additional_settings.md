This page in [English](/docs/en/additional_settings.md)

# Настройка конфигурации

Стандартная настройка регистрации модуля _registry_ в конфигурации приложения включает в себя следующие разделы:

- [x] [Настройка отображения статуса ЭП `"signedClasses"`](/docs/ru/additional_settings.md#настройка-отображения-статуса-эп)
- [x] [Настройка кеширования ресурсов в браузере `"staticOptions"`](/docs/ru/additional_settings.md#настройка-кеширования-ресурсов-в-браузере)
- [x] [Переопределение состава системного меню для модуля `"explicitTopMenu"`](/docs/ru/additional_settings.md#переопределение-состава-системного-меню-для-модуля)
- [x] [Настройка предварительной выборки объектов загрузки `"eagerLoading"`](/docs/ru/additional_settings.md#настройка-предварительной-выборки-объектов-загрузки)
- [x] [Настройка поиска объектов `"listSearchMinLength"` и `"listSearchOptions"`](/docs/ru/additional_settings.md#настройка-поиска-объектов)
- [x] [Настройка упорядоченного хранения файлов `"storage"`](/docs/ru/additional_settings.md#настройка-упорядоченного-хранения-файлов)
- [x] [Страница модуля по умолчанию `"defaultPath"`](/docs/ru/additional_settings.md#страница-модуля-по-умолчанию)
- [x] [Настройка редактирования объектов в списке `"inlineForm"`](/docs/ru/additional_settings.md#настройка-редактирования-объектов-в-списке)
- [x] [Настройка системного меню приложения `"navigation"`](/docs/ru/additional_settings.md#настройка-системного-меню-приложения)
- [x] [Определение пути к шаблонам `"templates"`](/docs/ru/additional_settings.md#определение-пути-к-шаблонам)
- [x] [Интеграция внешних значков `"statics"`](/docs/ru/additional_settings.md#интеграция-внешних-значков)
- [x] [Настройка уникальной иконки для страницы модуля `"logo"`](/docs/ru/additional_settings.md#настройка-уникальной-иконки-для-страницы-модуля)
- [x] Настройка исполняемых задач `"di"` включает в себя:
 - [Экспорт в печатную форму](/docs/ru/additional_settings.md#экспорт-в-печатную-форму)
 - [Настройка утилиты](/docs/ru/additional_settings.md#настройка-утилиты)
 - [Настройка дополнительных действий на форме](/docs/ru/additional_settings.md#настройка-дополнительных-действий-на-форме)
 - [Создание предзаданного массива объектов](/docs/ru/additional_settings.md#создание-предзаданного-массива-объектов)
 - [Настройка иерархического представления для коллекций](/docs/ru/additional_settings.md#настройка-иерархического-представления-для-коллекций)
 - [Настройка взаимодействия с OwnCloud при работе с файлами](/docs/ru/additional_settings.md#настройка-взаимодействия-с-owncloud-при-работе-с-файлами)
 - [Настройка взаимодействия с OwnCloud при работе с коллекцией файлов](/docs/ru/additional_settings.md#настройка-взаимодействия-с-owncloud-при-работе-с-коллекцией-файлов)


Структура которых строится следующим образом:

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

## Настройка отображения статуса ЭП

Для запроса и отображения статуса электронной подписи (ЭП) на форме добавляем настройку `"signedClasses"`, в ней перечисляем классы, на форме которых необходимо отображать этот статус. [Подробнее о настройке ЭЦП](https://github.com/iondv/framework/blob/master/docs/ru/2_system_description/functionality/eds.md).
```javascript
"signedClasses": [
  "nameClass@namespaceApp"
]
```

## Настройка кеширования ресурсов в браузере

Настройка позволяет, исключать из проверки файлы, которые уже были получены на сервер при обращении к странице модуля registry.
Что позволяет отображать статичные файлы из кеша. Для свойства `"maxAge"` прописываем кеширование в миллисекундах.
```javascript
"staticOptions": {
  "maxAge": 3600000
}
```

```
NB. Активируется только при значении переменной "NODE_ENV = production"
```

## Переопределение состава системного меню для модуля

Системное меню задается в глобальных настройках конфигурации. Но есть возможность переопределить состав системного  меню для страницы каждого модуля. Для этого необходимо в настройках конфигурации модуля для свойства `"explicitTopMenu"` задать системные наименования необходимых пунктов меню:
```javascript
"explicitTopMenu": [
  "nameNavigation", //пункт навигации, который входит в состав системного меню страницы модуля registry
  { // модуль, на страницу которого осуществляется переход из пункта системного меню 
    "type": "system",
    "name": "nameModule"
  }
]
```

## Настройка предварительной выборки объектов загрузки

Позволяет указать связанные объекты, которые необходимо загрузить для корректного отображения их семантики, при выполнении операций над основным объектом (просмотр информации в карточке объекта, отображение списка объектов, экспорт информации по объекту в печатную форму). [Подробнее о предварительной выборке объектов загрузки](https://github.com/iondv/framework/blob/master/docs/ru/2_system_description/metadata_structure/meta_class/eager_loading.md). Задается для класса основного объекта.
```javascript
"eagerLoading": {
  "*": { // все типы объектов
    "nameClass@namespaceApp": { // класс основного объекта
      "item": [
        "nameAttr.nameAttr2.nameAttr3" // путь до связанного объекта для корректного отображения на форме редактирования
      ],
      "list": [
        "nameAttr.nameAttr2.nameAttr3" // путь до связанного объекта для корректного отображения в представлении списка
      ],
      "exportItem": [
        "nameAttr.nameAttr2.nameAttr3" // путь до связанного объекта для корректного отображения на форме редактирования
      ]
    }
  }
}
```

## Настройка поиска объектов

Функционал позволяет на уровне класса определять, как ищем объекты класса из представления списка: по вхождению слов или полные слова, по отдельным атрибутам или по указанным атрибутам в списке с параметрами поиска через пробел.
```javascript
"listSearchMinLength": 3, // минимальное колличество символов в поисковой строке для осуществления запроса
"listSearchOptions": {
  "nameClass@namespaceApp": { // класс, для объектов которого необходимо настроить поиск
    "*": { // везде по умолчанию
      "searchBy": [ // атрибуты класса, по значению которых будет осуществляться поиск
        "nameAttr"
      ],
      "mode": [ // режимы сопоставления - в данном случае "начинается с" (доступны like, contains, starts, ends)
        "starts"
      ],
      "minLength": 1 // минимальное количество символов для поиска объектов отдельного класса
    }
  }
}
```

## Настройка упорядоченного хранения файлов

Настройка позволяет задать путь для хранения файла в хранилище "OwnCloud":
```javascript
"storage": {
  "nameClass@namespaceApp": {
    "cloudFile": "/${class}/ns_${attr}/${dddd}/",
    "resultCloudFile": "/${class}/ns_${attr}/${dddd}/"
  }
}
```
где `"cloudFile"` и `"resultCloudFile"` - атрибута типа "Файл" класса `"nameClass@namespaceApp"`.

## Страница модуля по умолчанию

После перехода на страницу модуля registry есть возможность открывать по умолчанию страницу, заданную в свойстве `"defaultPath"`.
```javascript
"defaultPath": "nameModule"
```

## Настройка редактирования объектов в списке

Стандартный механизм изменения значений атрибутов выглядит следующим образом: _необходимо открыть форму редактирования объекта, внести необходимые изменения, сохраненить внесенные изменения_. Настройка `"inlineForm"` позволяет изменять значения атрибут не только на форме редактирования объекта, но и в списке объектов. 
```javascript
"inlineForm": true
```

## Настройка системного меню приложения

```javascript
"navigation": {
  "namespaces": {
    "namespaceApp": "Приложение" // пространство имен приложения
  },
  "menus": {
    "top": [ // вид навигации
      "namespaceApp@nameNavigation" // перечисление пунктов
    ]
  }
}
```
`"top"` - Пункты системного меню. Перечисляются секции/пункты навигации, которые будут расположены в верхней части страницы модуля.
`"left"` - Пункты бокового меню. Перечисляются секции/пункты навигации, которые будут расположены в левой части страницы модуля.

## Определение пути к шаблонам

Задается путь к папке, содержащей дополнительные настройки приложения для применения в модуле registry. Путь задается относительно платформы.
```javascript
"templates": [
  "applications/namespaceApp/templates/registry"
]
```

## Интеграция внешних значков

В приложении необходимо объявить директорию, содержащую статичные файлы, которые будет отдавать сервер. Для этого объявляем ее следующим образом:
```javascript
"statics": {
  "common-static": "applications/namespaceApp/templates/registry/static"
}
```

## Настройка уникальной иконки для страницы модуля

Иконка будет отображаться в левом верхнем углу на странице модуля. Путь к иконке состоит из переменной статичного шаблона, определенной в разделе "statics" и наименования файла.
```javascript
"logo": "common-static/logo.png",
```

## Настройка исполняемых задач

В разделе `"di"` настроек конфигурации модуля задаются испольняемые задачи. Описание задач представлено ниже в виде подпунктов.

### Экспорт в печатную форму

Печатная форма (сокращ. ПФ) - документ формата .docx/.xlsx, в который выполняется экспорт данных с формы объекты в по заданному шаблону. [Подробнее о настройке ПФ](https://github.com/iondv/framework/blob/master/docs/ru/2_system_description/functionality/printed_forms.md)

Настройка задается в 2 этапа. **Первый** - необходимо задать параметры экспорта.
```javascript
"pmItemToDocx": { // шаблон экспорта, указывает на формат документа
  "module": "modules/registry/export/itemToDocx", // путь к шаблону настроек экспорта в документ формата .docx
  "initMethod": "init", // метод
  "initLevel": 0,
  "options": { 
    "tplDir": "applications/namespaceApp/export/item", // путь к папке, содержащей шаблон ПФ в приложении
    "injectors": []
  }
}
```

**Второй** - необходимо задать параметры ПФ.
```javascript
"export": {
  "options": {
    "configs": {
      "nameClass@namespaceApp": { // класс, на форме которого будет выполняться экспорт в ПФ
        "namePrintedForms": { // системное наименование ПФ
          "caption": "Наименование ПФ",
          "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "extension": "docx", // формат ПФ
          "type": "item", // тип формы представления объекта, с которой будет осуществляться экспорт в ПФ
          "params": { // параметры ПФ (при наличии)
            "periodYYYY": { // при выборе действия "Экспорт" откроется окно для выбора периода
              "caption": "Год",
              "type": "string"
            }
          },
          "preprocessor": "ion://pmItemToDocx", // указывается шаблон экспорта
          "eagerLoading": [ // атрибуты, которым необходима дополнительная загрузка для корректного отображения значений
            "nameAttr"
          ],
          "fileNameTemplate": "Наименование ПФ.${item.name}", // наименования файла экспорта
          "isBackground": true // указывает на возможность экспорта ПФ в фоновом режиме
        }
      }
    }
  }
}
```

### Настройка утилиты

Утилита - программа, запускающая заданный процесс в приложении, настройки которого находятся в отдельном файле. Такие файлы расположены в папке `"applications/namespaceApp/lib"`. [Подробнее о назначении и настройке утилит](https://github.com/iondv/framework/blob/master/docs/ru/2_system_description/functionality/utilities.md). Настройка конфигурации утилиты выглядит следующим образом: 
```javascript
"nameUtil": { // системное наименование утилиты
  "module": "applications/namespaceApp/lib/actions/nameUtil", // путь к настройкам утилиты
  "initMethod": "init", // метод
  "initLevel": 2,
  "options": { // статичные опции любой утилиты
    "data": "ion://securedDataRepo",
    "workflows": "ion://workflows",
    "log": "ion://sysLog",
    "changelogFactory": "ion://changelogFactory",
    "state": "start" // условие, при котором доступен запуск утилиты (при наличии)
  }
}
```

### Настройка дополнительных действий на форме

Используется в случае, когда для запуска утилиты необходмо добавить дополнительное действие на форму, помимо [стандартных](https://github.com/iondv/framework/blob/master/docs/ru/2_system_description/metadata_structure/meta_view/commands.md). Для свойства `"actions"` нужно прописать сод действия, запускающего утилиту, например:
```javascript
"actions": {
  "options": {
    "actions": [
      {
        "code": "CREATE_NEW_VALUE",
        "handler": "ion://nameUtil" // объявление утилиты
      }
    ]
  }
}
```

### Создание предзаданного массива объектов

Позволяет задать шаблон, по которому будут создаваться объекты в коллекцию на форме при переходе по этапу бизнес-процесса (БП). Запускается процесс на основе утилиты `collectionCreator`. Настройка конфигурации состоит из стандартных настроек утилиты, описание которых есть в пунтке выше и перечислении шаблонов для создания объектов в коллекцию в разделе `"map"`.
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
      "nameWorkflow@namespaceApp:state": { // статус БП, при переходе на который, запускается процесс создания объектов
        "nameClass@namespaceApp": { // на форме объекта какого класса создаются объекты в коллекцию
          "nameAttr": { // наименование атрибута коллекции
            "elementClass": "nameClassAttr@namespaceApp", // объекты какого класса создаются в коллекцию
            "patterns": [
              {
                "values": { // значения атрибутов для создающихся объектов
                  "nameAttr1": "string", // строка
                  "nameAttr2": 123, // число
                  "nameAttr3": true,
                  "nameAttr4": "$containerProperty1", // свойство контейнера
                  "nameAttr5": {"add": ["$containerProperty2", 300]} // формула
                },
                "push": [
                  "nameWorkflow2@namespaceApp.close" // присвоение статуса БП
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

### Настройка иерархического представления для коллекций

**Иерархическое представление коллекций** - отображает коллекции, в которых элементы связаны друг с другом в виде иерархического справочника. В библиотеке `viewlib-extra` реализован функционал, возвращающий в формате `TreeGrid` очередной уровень иерархии.
```javascript
"treegridController": {
  "module": "applications/viewlib-extra/lib/controllers/api/treegrid", // путь к шаблону библиотеки viewlib-extra
  "initMethod": "init",
  "initLevel": 0,
  "options": { // настройка иерархии
    "module": "ion://module",
    "logger": "ion://sysLog",
    "dataRepo": "ion://securedDataRepo",
    "metaRepo": "ion://metaRepo",
    "auth": "ion://auth",
    "config": {
      "*": { // распространяется на все навигационные ноды
        "nameClass@namespaceApp": {
          "roots": [ // перечисление атрибутов класса, используемых как корневые (используются "conditions")
            {
              "property": "name",
              "operation": 1,
              "value": [
                null
              ],
              "nestedConditions": []
            }
          ],
          "childs": [ // перечисление атрибутов класса для построения иерархии
            "classAttr"
          ]
        }
      }
    }
  }
}
```

### Настройка взаимодействия с OwnCloud при работе с файлами

Документация по настройке и работе с файлами приложения расположена по [ссылке](https://github.com/iondv/framework/blob/master/docs/ru/2_system_description/metadata_structure/meta_view/fileshare.md). Настройка конфигурации задается следующим образом:
```javascript
"fileshareController": { // наименование шаблона библиотеки viewlib
  "module": "applications/viewlib/lib/controllers/api/fileshare", // путь к шаблону библиотеки viewlib
  "initMethod": "init",
  "initLevel": 0,
  "options": {
    "module": "ion://module",
    "fileStorage": "ion://fileStorage"
  }
}
```

### Настройка взаимодействия с OwnCloud при работе с коллекцией файлов

По принципу "Настройки взаимодействия с OwnCloud при работе с файлами"
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
