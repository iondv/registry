
function onCadesLoaded(cb) {
  if (typeof cadesplugin === 'undefined') {
    return cb();
  }

  var canPromise = !!window.Promise;
  if(canPromise) {
    cadesplugin.then(cb,
      function(error) {
        console.error(error);
        cb(error);
      }
    );
  } else {
    window.addEventListener("message", function (event){
        if (event.data === "cadesplugin_loaded") {
          cb();
        } else if(event.data === "cadesplugin_load_error") {
          console.error(__('js.cryptopro.notloaded'));
          cb(__('js.cryptopro.notloaded'));
        }
      },
      false);
    window.postMessage("cadesplugin_echo_request", "*");
  }
}

function CryptoPro() {
	this.state = "ready";
  this.store = null;

	this.CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
	this.CADES_BES = 1;
	// CADESCOM_XML_SIGNATURE_TYPE
	this.CADESCOM_XML_SIGNATURE_TYPE_ENVELOPED = 0;
	this.CADESCOM_XML_SIGNATURE_TYPE_ENVELOPING = 1;
	this.CADESCOM_XML_SIGNATURE_TYPE_TEMPLATE = 2;

	this.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN = 1;

	this.XML_DSIG_GOST_3410_URL = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102001-gostr3411";
	this.XML_DSIG_GOST_3411_URL = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr3411";

	this.OBJ_CAPI_STORE = "CAPICOM.Store";
	this.OBJ_CADES_CP_SIGNER = "CAdESCOM.CPSigner";
	this.OBJ_CADES_SIGNED_DATA = "CAdESCOM.CadesSignedData";
	this.OBJ_CADES_SIGNED_XML = "CAdESCOM.SignedXML";

  this.CAPICOM_CURRENT_USER_STORE = 2;
  this.CAPICOM_MY_STORE = "My";
  this.CAPICOM_LOCAL_MACHINE_STORE = 1;
  this.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED = 2;

	this.MS_CANT_FIND_OBJ_OR_PROP = 0x80092004;
}

function formCertInfo(cert) {
  var sn = cert.SubjectName;
  var from = sn.indexOf('CN=');
  if (from >= 0) {
      sn = sn.substring(from + 3, sn.indexOf(',', from));
  } else {
    from = sn.indexOf('O=');
    if (from >= 0) {
      sn = sn.substring(from + 2, sn.indexOf(',', from));
    }
  }
  var org = cert.IssuerName;
  from = org.indexOf('CN=');
  if (from >= 0) {
    org = org.substring(from + 3, org.indexOf(',', from));
  } else {
    from = org.indexOf('O=');
    if (from >= 0) {
      org = org.substring(from + 2, org.indexOf(',', from));
    }
  }
  var name = cert.SubjectName;
  var lastName = '';
  from = name.indexOf('SN=');
  if (from !== -1) {
    lastName = name.substring(from + 3, name.indexOf(',', from));
  }
  var firstName = '';
  from = name.indexOf('G=');
  if (from !== -1) {
    firstName = name.substring(from + 2, name.indexOf(',', from));
  }
  return {
    Serial: cert.SerialNumber,
    Subject: sn,
    Issuer: org,
    ValidSince: cert.ValidFromDate,
    ValidTill: cert.ValidToDate,
    SubjectName: cert.SubjectName,
    IssuerName: cert.IssuerName,
    lastName: lastName,
    firstName: firstName
  };
}

CryptoPro.prototype.open = function (cb) {
  if (typeof cadesplugin === 'undefined') {
    return cb();
  }
  if (typeof cadesplugin.CreateObject === 'function') {
    this.store = cadesplugin.CreateObject(this.OBJ_CAPI_STORE);
    this.store.Open();
    cb();
  } else if (typeof cadesplugin.CreateObjectAsync === 'function') {
    var me = this;
    cadesplugin.async_spawn(function *(args) {
      me.store = yield cadesplugin.CreateObjectAsync(me.OBJ_CAPI_STORE);
      yield me.store.Open();
      cb();
    });
  } else {
    cb(new Error(__('js.cryptopro.failopen')));
  }
};

CryptoPro.prototype.close = function (cb) {
  if (typeof cadesplugin === 'undefined') {
    return cb();
  }
  if (typeof cadesplugin.CreateObject === 'function') {
    this.store.Close();
    cb();
  } else if (typeof cadesplugin.CreateObjectAsync === 'function') {
    var me = this;
    cadesplugin.async_spawn(function *(args) {
      yield me.store.Close();
      cb();
    });
  } else {
    cb(new Error(__('js.cryptopro.failclose')));
  }
};

CryptoPro.prototype.getCerts = function(cb) {
  if (typeof cadesplugin === 'undefined') {
    return cb({});
  }
  var me = this;
  if (typeof cadesplugin.CreateObject === 'function') {
    var result = {};
    var CertificatesObj = this.store.Certificates;
    var Count = CertificatesObj.Count;
    var now = new Date();
    for (var i = 1; i <= Count; i++) {
      var cert = CertificatesObj.Item(i);
      var vtd = new Date(cert.ValidToDate);
      var vfd = new Date(cert.ValidFromDate);
      if (now.getTime() <= vtd.getTime() && now.getTime() >= vfd.getTime()
        && cert.HasPrivateKey()
        && cert.IsValid().Result) {
        result[cert.Thumbprint] = formCertInfo(cert);
      }
    }
    cb(result);
  } else if (typeof cadesplugin.CreateObjectAsync === 'function') {
    var me = this;
    cadesplugin.async_spawn(function *(args) {
        var result = {};
        var CertificatesObj = yield me.store.Certificates;
        var Count = yield CertificatesObj.Count;
        var now = new Date();
        for (var i = 1; i <= Count; i++) {
          var cert = yield CertificatesObj.Item(i);
          var vtd = new Date(yield cert.ValidToDate);
          var vfd = new Date(yield cert.ValidFromDate);
          var hpk = yield cert.HasPrivateKey();
          var iv = yield cert.IsValid();
          iv = yield iv.Result;
          if (now.getTime() <= vtd.getTime() && now.getTime() >= vfd.getTime()
            && hpk
            && iv) {
            var key = yield cert.Thumbprint;
            var sn = yield cert.SubjectName;
            var isn = yield cert.IssuerName;
            var ser = yield cert.SerialNumber;
            result[key] = formCertInfo(
              {
                SubjectName: sn,
                IssuerName: isn,
                SerialNumber: ser,
                ValidFromDate: vfd,
                ValidToDate: vtd
              }
            );
          }
        }
        cb(result);
    });
  } else {
    cb({});
  }
};

CryptoPro.prototype.getSignFunc = function(contentType, onFail, data){
	var signFunc = null;
	if (contentType.indexOf("application/xml") === 0) {
		signFunc = this.makeXMLSign;
		data.attributes["actualSignatureType"] = this.OBJ_CADES_SIGNED_XML;
	} else if (contentType.indexOf("application/json") === 0
			|| contentType.indexOf("text/plain") === 0
      || contentType.indexOf("application/octet-stream") === 0
  ) {
		signFunc = this.makeCadesBesSign;
		data.attributes["actualSignatureType"] = this.OBJ_CADES_SIGNED_DATA;
	} else {
		onFail.call(this, __('js.cryptopro.wrongcontent', {contentType: contentType}));
	}
	return signFunc;
}

CryptoPro.prototype.abort = function () {
  this.state = "ready";
};

CryptoPro.prototype.makeSign = function(params, onFail, onSuccess, onNeedCertSelect) {
  if (typeof cadesplugin === 'undefined') {
    return onFail(new Error(__('js.cryptopro.noplugin')));
  }

	var me = this;
	if (me.state === "ready") {

    function mkSign(index, signFunc, data, cert) {
      var d = jQuery.Deferred();
      signFunc.call(me, data.parts[index], cert, function (sign, err) {
        if (err) {
          return d.reject(err);
        }
        d.resolve(sign);
      });
      return d;
    }

		this.state = "receiving";
		$.ajax({
			context: this,
		    type: "POST",
		    url: params.dataUrl,
		    data: {action: params.action},
		    beforeSend: function(xhr) {
			    xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
		    }
		}).always(
			function(data, textStatus, jqXHR) {
				var success = (textStatus === "success") || (textStatus === "notmodified");
				if (success) {
					me.state = "signing";

					if (data.parts && data.parts.length > 0) {
						var doSign = function(certKey){
							try {
                me.getCertificate(certKey, function (cert, err) {
                  if (err || !cert) {
                    me.state = "ready";
                    return onFail.call(me, err || __('js.cryptopro.nocert'));
                  }

                  var signFunc = null;
                  var deffereds = [];
                  for (var i = 0; i < data.parts.length; i++){
                    signFunc = me.getSignFunc(data.parts[i].mimeType, onFail, data);
                    deffereds.push(mkSign(i, signFunc, data, cert));
                  }

                  $.when.apply($, deffereds).then(function (signatures) {
                    me.sendSign(params, data, signatures, onFail, onSuccess);
                  }).fail(function (err) {
                    me.state = 'ready';
                    onFail.call(me, err);
                  });
                });
							} catch (err) {
                me.state = 'ready';
                onFail.call(me, err);
							}
						};

						if ("function" === typeof onNeedCertSelect){
							onNeedCertSelect.call(me,doSign);
						} else {
							me.getCerts(function (certs) {
                for (certKey in certs){
                  doSign(certKey);
                  return;
                }
                me.state = "ready";
                onFail.call(me, __("js.cryptopro.nocerts"));
              });
						}
					} else {
            me.state = "ready";
            onFail.call(me, __("js.cryptopro.nodata"));
          }
				} else {
					me.state = "ready";
					onFail.call(me, textStatus);
				}
			});
	} else {
		onFail.call(me, __("js.cryptopro.busy"));
	}
};

CryptoPro.prototype.sendSign = function(params, data, signatures, onFail, onSuccess) {
	this.state = "sending";
	var me = this;

	data.signatures = signatures;

	var sd = {
		action: params.action,
		data: data.parts,
		attributes: data.attributes,
		signatures: (typeof signatures === 'string') ? [signatures] : signatures
	};

	$.ajax({
		context: this,
		type: "POST",
	    url: params.signUrl,
	    data: JSON.stringify(sd),
	    dataType:"json",
	    contentType: "application/json; charset=utf-8"/*,
	    beforeSend: function(xhr) {
		    xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
	    }*/
	}).always(function(data, textStatus, jqXHR) {
		var success = (textStatus === "success");
		me.state = "ready";
		if (!success) {
			onFail.call(me, __("js.cryptopro.wrongstatus", {status: textStatus}));
		} else {
      var dt = typeof data;
      if (dt !== "object") {
        onFail.call(me, __("js.cryptopro.wrongtype", {type: dt}));
      } else {
        if (data.message && data.type === "ERROR") {
          onFail.call(me, __("js.cryptopro.servererror", {message: data.message}));
        } else if ("function" === typeof onSuccess){
          onSuccess.call(me);
        }
      }
		}
	});
};

//CryptoPro.prototype.notifyComplete = function

CryptoPro.prototype.getCertificate = function(thumbprint, cb) {
	// ??
	// var thumbprint = e.options[selectedCertID].value.split("
	// ").reverse().join(
	// "").replace(/\s/g, "").toUpperCase();
  if (typeof cadesplugin.CreateObject === 'function') {
    try {
      var oCerts = this.store.Certificates.Find(this.CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);
      if (oCerts.Count == 0) {
        return cb(null, new Error(__('js.cryptopro.nocert')));
      }
      var result = oCerts.Item(1);
      cb(result);
    } catch (e) {
      cb(null, e);
    }
  } else if (typeof cadesplugin.CreateObjectAsync === 'function') {
    var me = this;
    cadesplugin.async_spawn(function *(args) {
      var store;
      try {
        var certsObj = yield me.store.Certificates;
        var oCerts = yield certsObj.Find(me.CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);
        var Count = yield oCerts.Count;
        if (Count == 0) {
          return arg[0](null, new Error(__('js.cryptopro.nocert')));
        }
        var result = yield oCerts.Item(1);
        cb(result);
      } catch (e) {
        cb(null, e);
      }
    });
  } else {
   cb(null, new Error(__('js.cryptopro.failgetcert')));
  }
};

CryptoPro.prototype.makeCadesBesSign = function(dataToSign, certObject, cb) {
  if (typeof cadesplugin.CreateObject === 'function') {
    try {
      var oSigner = cadesplugin.CreateObject(this.OBJ_CADES_CP_SIGNER);
      oSigner.Certificate = certObject;
      oSigner.Options = this.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN;

      var oSignedData = cadesplugin.CreateObject(this.OBJ_CADES_SIGNED_DATA);
      oSignedData.ContentEncoding = 1;
      oSignedData.Content = dataToSign.content;

      var Signature = oSignedData.SignCades(oSigner, this.CADES_BES, dataToSign.attributes && dataToSign.attributes.detached);
      Signature = Signature.replace(/\r/g, "").replace(/\n/g, "");
      cb(Signature);
    } catch (e) {
      cb(null, e);
    }
  }  else if (typeof cadesplugin.CreateObjectAsync === 'function') {
    var me = this;
    cadesplugin.async_spawn(function *(args) {
      try {
        var oSigner = yield cadesplugin.CreateObjectAsync(me.OBJ_CADES_CP_SIGNER);
        var oSignedData = yield cadesplugin.CreateObjectAsync(me.OBJ_CADES_SIGNED_DATA);

        yield oSigner.propset_Certificate(certObject);
        yield oSigner.propset_Options(me.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN);

        yield oSignedData.propset_ContentEncoding(1);
        yield oSignedData.propset_Content(dataToSign.content);
        var Signature = yield oSignedData.SignCades(oSigner, me.CADES_BES, dataToSign.attributes && dataToSign.attributes.detached);
        Signature = Signature.replace(/\r/g, "").replace(/\n/g, "");
        cb(Signature);
      } catch (e) {
        cb(null, e);
      }
    });
  } else {
    cb(null, new Error(__('js.cryptopro.failmakesign')));
  }
};

/**
 *
 * @param {{content: String}} dataToSign
 * @param certObject
 * @returns (String)
 */
CryptoPro.prototype.makeXMLSign = function(dataToSign, certObject, cb) {
  if (typeof cadesplugin.CreateObject === 'function') {
    try {
      var oSigner = cadesplugin.CreateObject(this.OBJ_CADES_CP_SIGNER);
      oSigner.Certificate = certObject;
      oSigner.Options = this.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN;
      var oSignedXML = cadesplugin.CreateObject(this.OBJ_CADES_SIGNED_XML);
      oSignedXML.Content = dataToSign.content;
      oSignedXML.SignatureType = this.CADESCOM_XML_SIGNATURE_TYPE_ENVELOPING;
      oSignedXML.SignatureMethod = this.XML_DSIG_GOST_3410_URL;
      oSignedXML.DigestMethod = this.XML_DSIG_GOST_3411_URL;
      var sSignedMessage = oSignedXML.Sign(oSigner);
      cb(sSignedMessage.replace(/\r/g, "").replace(/\n/g, ""));
    } catch (e) {
      cb(null, e);
    }
  }  else if (typeof cadesplugin.CreateObjectAsync === 'function') {
    var me = this;
    cadesplugin.async_spawn(function *(args) {
      try {
        var oSigner = yield cadesplugin.CreateObjectAsync(me.OBJ_CADES_CP_SIGNER);
        var oSignedXML = yield cadesplugin.CreateObjectAsync(me.OBJ_CADES_SIGNED_XML);
        yield oSigner.propset_Certificate(certObject);
        yield oSigner.propset_Options(me.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN);

        yield oSignedXML.propset_Content(dataToSign.content);
        yield oSignedXML.propset_SignatureType(me.CADESCOM_XML_SIGNATURE_TYPE_ENVELOPING);
        yield oSignedXML.propset_SignatureMethod(me.XML_DSIG_GOST_3410_URL);
        yield oSignedXML.propset_DigestMethod(me.XML_DSIG_GOST_3411_URL);
        var sSignedMessage = yield oSignedXML.Sign(oSigner);
        cb(sSignedMessage.replace(/\r/g, "").replace(/\n/g, ""));
      } catch (e) {
        cb(null, e);
      }
    });
  } else {
    cb(null, new Error(__('js.cryptopro.failmakesign')));
  }
};

CryptoPro.prototype.getCertFromSign = function(sign, cb) {
  if (typeof cadesplugin.CreateObject === 'function') {
    try {
      var result = [];
      var oSignedData = cadesplugin.CreateObject(this.OBJ_CADES_SIGNED_DATA);
      oSignedData.VerifyCades(sign, this.CADES_BES);
      var CertificatesObj = oSignedData.Certificates;
      var Count = CertificatesObj.Count;
      for (var i = 1; i <= Count; i++) {
        var cert = CertificatesObj.Item(i);
        var vtd = new Date(cert.ValidToDate);
        var vfd = new Date(cert.ValidFromDate);
        result.push(formCertInfo(cert));
      }
      cb(result);
    } catch (e) {
      cb(null, e);
    }
  } else if (typeof cadesplugin.CreateObjectAsync === 'function') {
    var me = this;
    cadesplugin.async_spawn(function *(args) {
      try {
        var result = [];
        var oSignedData = yield cadesplugin.CreateObjectAsync(me.OBJ_CADES_SIGNED_DATA);
        yield oSignedData.VerifyCades(sign, me.CADES_BES);
        var CertificatesObj = yield oSignedData.Certificates;
        var Count = yield CertificatesObj.Count;
        for (var i = 1; i <= Count; i++) {
          var cert = yield CertificatesObj.Item(i);
          var vtd = new Date(yield cert.ValidToDate);
          var vfd = new Date(yield cert.ValidFromDate);
          var key = yield cert.Thumbprint;
          var sn = yield cert.SubjectName;
          var isn = yield cert.IssuerName;
          var ser = yield cert.SerialNumber;
          result.push(formCertInfo(
            {
              SubjectName: sn,
              IssuerName: isn,
              SerialNumber: ser,
              ValidFromDate: vfd,
              ValidToDate: vtd
            }
          ));
        }
        cb(result);
      } catch (e) {
        cb(null, e);
      }
    });
  } else {
    cb(null, new Error(__('js.cryptopro.failgetcertsign')));
  }
};

CryptoPro.prototype.verifySign = function(sign, cb) {
  if (typeof cadesplugin.CreateObject === 'function') {
    try {
      var result = [];
      var oSignedData = cadesplugin.CreateObject(this.OBJ_CADES_SIGNED_DATA);
      oSignedData.VerifyCades(sign, this.CADES_BES);
      cb(true);
    } catch (e) {
      cb(false);
    }
  } else if (typeof cadesplugin.CreateObjectAsync === 'function') {
    var me = this;
    cadesplugin.async_spawn(function *(args) {
      try {
        var result = [];
        var oSignedData = yield cadesplugin.CreateObjectAsync(me.OBJ_CADES_SIGNED_DATA);
        yield oSignedData.VerifyCades(sign, me.CADES_BES);
        cb(true);
      } catch (e) {
        cb(false);
      }
    });
  } else {
    cb(false);
  }
}
