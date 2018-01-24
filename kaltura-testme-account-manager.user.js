// ==UserScript==
// @name        TestMe Account Manager
// @description User Script for managing accounts in Kaltura TestMe Console and create sessions easily
// @author      yusitnikov
// @version     1.7
// @updateURL   https://github.com/yusitnikov/testme-account-manager/raw/master/kaltura-testme-account-manager.user.js
// @include     http://*.kaltura.com/api_v3/testme/*
// @include     https://*.kaltura.com/api_v3/testme/*
// @exclude     http://*.kaltura.com/api_v3/testme/client-libs.php
// @exclude     https://*.kaltura.com/api_v3/testme/client-libs.php
// @run-at      document-end
// @require     https://code.jquery.com/jquery-2.1.4.min.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_xmlhttpRequest
// ==/UserScript==

(function() {
	// prevent from loading twice
	if ($('#ktksm-li').size()) return;

	var baseUrl = location.protocol + '//' + location.hostname + '/api_v3/';

	var map = GM_getValue('map') || {},
		lastPid = GM_getValue('pid') || '';
	function saveMap() {
		GM_setValue('map', map);
	}

	var $li = $('<li id="ktksm-li"><select></select></li>'), $select = $li.find('select'),
		$li2 = $('<li><button>+</button></li>'), $add = $li2.find('button'),
		$li3 = $('<li><button>-</button></li>'), $drop = $li3.find('button'),
		$ksDetails = $('<div></div>'), $ks = $('[for=ks]+input');
	$('#kmcSubMenu').append($li).append($li2).append($li3);
	$ks.parent().append($ksDetails);

	var requestedPid;
	$select.change(function() {
		var pid = this.value;
		if (!pid) return;
		GM_setValue('pid', pid);
		var info = map[pid], name = info.name, errMsg = 'Failed to create KS for ' + name;
		$ks.val('');
		$ksDetails.html('&nbsp;');
		requestedPid = pid;
		$.ajax({
			url: baseUrl + '?service=session&action=start&secret=' + info.secret + '&type=2&partnerId=' + pid + '&privileges=disableentitlement,enablecategorymoderation&format=1',
			dataType: 'json',
			success: function(ks) {
				if (pid != requestedPid) return;
				if (typeof ks != 'string') {
					if (ks && ks.message) errMsg += ': ' + ks.message;
					alert(errMsg);
					return;
				}
				$ks.val(ks).click();
				$.ajax({
					url: baseUrl + '?service=partner&action=getInfo&format=1&ks=' + ks,
					dataType: 'json',
					success: function(partner) {
						$ksDetails.html('PID ' + pid + ' - ' + partner.name);
					},
					error: function() {
						$ksDetails.html('PID ' + pid + ' - ' + name);
					}
				});
			},
			error: function() {
				alert(errMsg);
			}
		});
	});

	$add.click(function() {
		var pid = prompt('Enter partnerId:');
		if (!pid) return;
		var name = prompt('Enter account name:');
		if (!name) return;
		var secret = prompt('Enter admin secret:');
		if (!secret) return;
		map[pid] = {
			name: name,
			secret: secret
		};
		saveMap();
		addOption(pid, true);
	});

	$drop.click(function() {
		var pid = $select.val();
		delete map[pid];
		saveMap();
		$select.find('[value=' + pid + ']').remove();
		if (Object.keys(map).length) $select.change();
	});

	function addOption(pid, select) {
		$select.append($('<option></option>').val(pid).text(map[pid].name + ' (#' + pid + ')'));
		if (select) $select.val(pid).change();
	}

	for (var pid in map) {
		if (map.hasOwnProperty(pid)) {
			// noinspection EqualityComparisonWithCoercionJS
            addOption(pid, pid == lastPid);
        }
    }
	if (Object.keys(map).length) $select.change();
})();
