/**
 * Created by kras on 30.05.16.
 */
'use strict';
const moduleName = require('../module-name');
const Permissions = require('core/Permissions');

const menuTypes = {
  TREE: 'tree',
  COMBO: 'combo'
};

module.exports.menuTypes = menuTypes;

function nodeAclId(node) {
  return node ? 'n:::' + (node.namespace ? node.namespace + '@' : '') + node.code : '';
}

module.exports.nodeAclId = nodeAclId;

function buildSubMenu(nodes, types, defaultType, aclResources) {
  const result = [];
  for (let i in nodes) {
    if (nodes.hasOwnProperty(i)) {
      const nodeType = types.hasOwnProperty(i) && typeof types[i].type !== 'undefined' ? types[i].type : defaultType;
      const subnodes = buildSubMenu(nodes[i].children,
        types.hasOwnProperty(i) && typeof types[i].nodes !== 'undefined' ? types[i].nodes : {},
        nodeType,
        aclResources);
      if (Object.keys(nodes).length === 1 && subnodes.length > 0)
        return subnodes;
      const aclId = nodeAclId(nodes[i]);
      let external = false;
      let url = '';
      switch (nodes[i].type) {
        case 0: break;
        case 3:
          ({url} = nodes[i]);
          external = nodes[i].external || false;
          break;
        default:
          url = `${moduleName}/${nodes[i].namespace ? `${nodes[i].namespace}@` : ''}${nodes[i].code}`;
          if (Array.isArray(aclResources))
            if (aclResources.indexOf(aclId) < 0)
              aclResources.push(aclId);
          break;
      }
      result.push({
        id: nodes[i].code,
        nodes: subnodes,
        hint: nodes[i].hint,
        caption: nodes[i].caption,
        url,
        external,
        orderNumber: nodes[i].orderNumber,
        type: typeParser(nodeType),
        aclId
      });
    }
  }
  orderMenu(result);
  return result;
}

module.exports.canonicNode = function (code) {
  let parts = code.split('@');
  if (parts.length > 1) {
    return {code: parts[1], ns: parts[0]};
  }
  return {code: parts[0]};
};

var buildMenu = function (moduleName, namespaces, menu, types, repo, aclResources) {

  let defaultNs = '';
  if (namespaces) {
    for (defaultNs in namespaces) {
      if (namespaces.hasOwnProperty(defaultNs)) {
        break;
      }
    }
  }

  let nsType = types && types.type || menuTypes.TREE;
  let subnodes = [];
  let sections = [];
  if (Array.isArray(menu)) {
    menu.forEach((s) => {
      sections.push(repo.getNavigationSection(s, defaultNs));
    });
  } else {
    sections = Object.values(repo.getNavigationSections(defaultNs));
  }
  for (let i = 0; i < sections.length; i++) {
    let sect = sections[i];
    if (sect) {
      let secType = types && types.sections && types.sections[sect.name] && types.sections[sect.name].type || nsType;
      let nodesTypes = types && types.sections && types.sections[sect.name] && types.sections[sect.name].nodes || {};
      let subSubnodes = buildSubMenu(sect.nodes, nodesTypes, secType, aclResources);
      if (sections.length === 1 && subSubnodes.length > 0) {
        subnodes = subSubnodes;
        break;
      } else {
        subnodes.push({
          id: sect.name,
          nodes: subSubnodes,
          hint: sect.caption,
          caption: sect.caption,
          url: null,
          itemType: sect.itemType,
          orderNumber: sect.orderNumber,
          type: typeParser(secType)
        });
      }
    }
  }
  return subnodes;
};

function typeParser(type) {
  switch (type) {
    case menuTypes.TREE:
    case menuTypes.COMBO: return type;
    case 'TREE': return menuTypes.TREE;
    case 'COMBO': return menuTypes.COMBO;
    default: return menuTypes.TREE;
  }
}

function orderMenu(nodes) {
  nodes.sort(function (a, b) {
    a = a.orderNumber;
    b = b.orderNumber;
    return a === undefined ? (b === undefined ? 0 : 1) : b === undefined ? -1 : a - b;
  });
}

/**
 * @param {Array} nodes
 * @param {String[]} forbidden
 * @returns {Array}
 */
function cleanForbidden(nodes, forbidden) {
  let result = [];
  if (nodes) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].aclId && forbidden.indexOf(nodes[i].aclId) >= 0) {
        continue;
      }

      if (nodes[i].nodes && nodes[i].nodes.length) {
        nodes[i].nodes = cleanForbidden(nodes[i].nodes, forbidden);
        if (!nodes[i].nodes.length) {
          continue;
        }
      }

      result.push(nodes[i]);
    }
  }
  return result;
}

/**
 * @param {{}} tplData
 * @param {Boolean} modal
 * @param {SettingsProvider} settings
 * @param {MetaRepository} metaRepo
 * @param {AclProvider} acl
 * @param {String} userId
 * @param {String} moduleName
 * @returns {Promise}
 */
module.exports.buildMenus = function (tplData, modal, settings, metaRepo, acl, user, moduleName) {
  tplData.menuTypes = menuTypes;
  tplData.isMenuOpened = isMenuOpened;
  if (!modal && user) {
    let n = settings.get(moduleName + '.navigation') || {};
    let menus = n.menus;
    let resources = [];
    if (menus) {
      tplData.leftMenu = buildMenu(moduleName, n.namespaces, menus.left || [], menus.types && menus.types.left || null, metaRepo, resources);
      tplData.rightMenu = buildMenu(moduleName, n.namespaces, menus.right || [], menus.types && menus.types.right || null, metaRepo, resources);
      tplData.topMenu = buildMenu(moduleName, n.namespaces, menus.top || [], menus.types && menus.types.top || null, metaRepo, resources);
      tplData.bottomMenu = buildMenu(moduleName, n.namespaces, menus.bottom || [], menus.types && menus.types.bottom || null, metaRepo, resources);
    } else {
      tplData.leftMenu = buildMenu(moduleName, n.namespaces, null, null, metaRepo, resources);
      tplData.topMenu = [];
      tplData.rightMenu = [];
      tplData.bottomMenu = [];
    }
    return acl.getPermissions(user, resources)
      .then(
        (permissions) => {
          let forbidden = [];
          for (let i = 0; i < resources.length; i++) {
            if (
              !permissions.hasOwnProperty(resources[i]) ||
              !permissions[resources[i]].hasOwnProperty(Permissions.READ)
            ) {
              forbidden.push(resources[i]);
            }
          }
          if (forbidden.length) {
            tplData.leftMenu = cleanForbidden(tplData.leftMenu, forbidden);
            tplData.rightMenu = cleanForbidden(tplData.rightMenu, forbidden);
            tplData.topMenu = cleanForbidden(tplData.topMenu, forbidden);
            tplData.bottomMenu = cleanForbidden(tplData.bottomMenu, forbidden);
          }
          tplData.hideSidebar = tplData.hideSidebar === undefined ? needHideSidebar(tplData) : tplData.hideSidebar;
          return tplData;
        }
      );
  } else {
    tplData.leftMenu = [];
    tplData.rightMenu = [];
    tplData.topMenu = [];
    tplData.bottomMenu = [];
    return Promise.resolve(tplData);
  }
};

function needHideSidebar (data) {
  if (data.leftMenu.length) {
    return false;
  }
  return true;
}

function isMenuOpened (mn, level) {
  let name;
  let ind = mn.id.lastIndexOf('.');
  if (ind !== -1) {
    name = mn.id.substr(ind + 1);
  } else {
    name = mn.id;
  }
  if (level) {
    if (mn.itemType === 'section') {
      for (var i = 0; i < mn.nodes.length; i++) {
        if (isMenuOpened(mn.nodes[i], level)) {
          return true;
        }
      }
    } else {
      return name === level;
    }
  }
  return false;
}
