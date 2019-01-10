// ==UserScript==
// @name        TestMe Account Manager
// @description User Script for managing accounts in Kaltura TestMe Console and create sessions easily
// @author      yusitnikov
// @version     2.1
// @updateURL   https://github.com/yusitnikov/testme-account-manager/raw/master/kaltura-testme-account-manager.user.js
// @include     http://*/api_v3/testme/*
// @include     https://*/api_v3/testme/*
// @exclude     http://*/api_v3/testme/client-libs.php
// @exclude     https://*/api_v3/testme/client-libs.php
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

    var host = location.hostname,
        envs = GM_getValue('envs') || { prod: 'prod' },
        requestedEnvMap = GM_getValue('env') || {},
        requestedEnv = requestedEnvMap[host] || 'prod',
        globalMap = GM_getValue('mapbyenv') || { prod: GM_getValue('map') || {} },
        map = {},
        requestedPidMap = GM_getValue('pidbyenv') || {},
        requestedPid = '',
        disablePidChange = false;
    function saveEnvMap() {
        GM_setValue('envs', envs);
    }
    function savePidMap() {
        GM_setValue('mapbyenv', globalMap);
    }

    var $li = $('<li id="ktksm-li"><select></select></li>'), $envSelect = $li.find('select'),
        $li2 = $('<li><button>+</button></li>'), $addEnv = $li2.find('button'),
        $li3 = $('<li><button>-</button></li>'), $dropEnv = $li3.find('button'),
        $li4 = $('<li><select></select></li>'), $pidSelect = $li4.find('select'),
        $li5 = $('<li><button>Edit</button></li>'), $editMap = $li5.find('button'),
        $li6 = $('<li><button>+</button></li>'), $addPid = $li6.find('button'),
        $li7 = $('<li><button>-</button></li>'), $dropPid = $li7.find('button'),
        $li8 = $('<li><input type="text" placeholder="User ID" value="admin"></li>'), $userIdInput = $li8.find('input'),
        $li9 = $('<li><input type="text" placeholder="Privileges" value="disableentitlement,enablecategorymoderation"></li>'), $privilegesInput = $li9.find('input'),
        $ksDetails = $('<div></div>'), $ks = $('[for=ks]+input');
    $('#kmcSubMenu').append($li).append($li2).append($li3).append($li4).append($li5).append($li6).append($li7).append($li8).append($li9);
    $ks.parent().append($ksDetails);

    function loadMapForCurrentEnv() {
        map = globalMap[requestedEnv] = globalMap[requestedEnv] || {};
        requestedPid = requestedPidMap[requestedEnv] || GM_getValue('pid') || '';

        disablePidChange = true;
        $pidSelect.empty();
        for (var pid in map) {
            if (map.hasOwnProperty(pid)) {
                // noinspection EqualityComparisonWithCoercionJS
                addPidOption(pid, pid == requestedPid);
            }
        }
        disablePidChange = false;
        if (Object.keys(map).length) $pidSelect.change();
    }

    $envSelect.change(function() {
        var env = this.value;
        if (!env) return;
        requestedEnvMap[host] = requestedEnv = env;
        GM_setValue('env', requestedEnvMap);
        loadMapForCurrentEnv();
    });

    $addEnv.click(function() {
        var env = prompt('Input name:');
        if (!env) {
            return;
        }
        envs[env] = env;
        saveEnvMap();
        addEnvOption(env, true);
    });

    $dropEnv.click(function() {
        var env = $envSelect.val();
        if (env == 'prod') {
            alert('Not allowed to delete prod environment');
            return;
        }
        delete envs[env];
        saveEnvMap();
        $envSelect.find('[value=' + env + ']').remove();
        if (Object.keys(envs).length) {
            $envSelect.change();
        }
    });

    $pidSelect.add($userIdInput).add($privilegesInput).change(function() {
        if (disablePidChange) return;
        var pid = $pidSelect.val();
        if (!pid) return;
        requestedPid = requestedPidMap[requestedEnv] = pid;
        GM_setValue('pidbyenv', requestedPidMap);
        var info = map[pid], name = info.name, errMsg = 'Failed to create KS for ' + name;
        $ks.val('');
        $ksDetails.html('&nbsp;');
        $.ajax({
            url: baseUrl + '?service=session&action=start&secret=' + info.secret + '&type=2&userId=' + $userIdInput.val() + '&partnerId=' + pid + '&privileges=' + $privilegesInput.val() + '&format=1',
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

    $addPid.click(function() {
        var dialog = showDialog(500, 150),
            $pid = dialog.appendInput('Partner ID'),
            $name = dialog.appendInput('Account name'),
            $secret = dialog.appendInput('Admin secret');
        dialog.appendButton('Save', function() {
            var pid = $pid.val();
            map[pid] = {
                name: $name.val(),
                secret: $secret.val()
            };
            savePidMap();
            addPidOption(pid, true);
            dialog.close();
        });
    });

    $dropPid.click(function() {
        var pid = $pidSelect.val();
        delete map[pid];
        savePidMap();
        $pidSelect.find('[value=' + pid + ']').remove();
        if (Object.keys(map).length) $pidSelect.change();
    });

    $editMap.click(function() {
        var dialog = showDialog(),
            $box = $('<textarea style="width: 100%; height: 100%;"></textarea>');
        $box.val(JSON.stringify(map, null, 4));
        dialog.appendContent($box);
        dialog.appendButton('Save', function() {
            try {
                var value = JSON.parse($box.val());
            } catch (ex) {
                alert('Parse error: ' + ex);
                return;
            }
            if (!$.isPlainObject(value)) {
                alert('Parse error: not an object');
                return;
            }
            map = globalMap[requestedEnv] = value;
            savePidMap();
            loadMapForCurrentEnv();
            dialog.close();
        });
    });

    for (var env in envs) {
        if (envs.hasOwnProperty(env)) {
            addEnvOption(env, env == requestedEnv);
        }
    }

    function addEnvOption(env, select) {
        $envSelect.append($('<option></option>').val(env).text(env));
        if (select) $envSelect.val(env).change();
    }

    function addPidOption(pid, select) {
        $pidSelect.append($('<option></option>').val(pid).text(map[pid].name + ' (#' + pid + ')'));
        if (select) $pidSelect.val(pid).change();
    }

    function showDialog(width, height) {
        function onEscape(ev) {
            if (ev.which == 27) {
                close();
            }
        }

        function close() {
            $body.unbind('keydown', onEscape);
            $wrap.remove();
            $div.remove();
        }

        var sizeCss = '';
        if (width) {
            sizeCss += 'width: ' + width + 'px; ';
        }
        if (height) {
            sizeCss += 'height: ' + height + 'px; ';
        }
        var $body = $('body'),
            $wrap = $('<div style="position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5);"></div>'),
            $div = $('<div style="position: fixed; ' + sizeCss + 'margin: auto; left: 10px; right: 10px; top: 10px; bottom: 10px; background: white; font-size: 16px;">' +
                '<div class="panel" style="position: absolute; left: 10px; right: 10px; top: 10px; bottom: 40px; overflow-y: auto;"></div>' +
                '<div class="footer" style="position: absolute; bottom: 10px; right: 10px;"></div>' +
            '</div>'),
            $panel = $div.find('.panel'),
            $footer = $div.find('.footer'),
            dialog = {
                appendContent: function(content) {
                    $panel.append(content);
                    return this;
                },
                appendInput: function(label, defaultValue) {
                    var $container = $('<div style="margin-bottom: 10px;"><label>' + label + ': <input type="text"></label></div>'),
                        $input = $container.find('input');
                    $input.val(defaultValue);
                    this.appendContent($container);
                    return $input;
                },
                createButton: function(title, callback) {
                    var $button = $('<button style="margin-left: 10px;">' + title + '</button>');
                    if (callback) {
                        $button.click(callback);
                    }
                    return $button;
                },
                appendButton: function(title, callback) {
                    var $button = this.createButton(title, callback);
                    $footer.append($button);
                    return $button;
                },
                prependButton: function(title, callback) {
                    var $button = this.createButton(title, callback);
                    $footer.prepend($button);
                    return $button;
                },
                close: function() {
                    close();
                    return this;
                }
            };
        $wrap.click(close);
        dialog.$cancelButton = dialog.appendButton('Cancel', close);
        $body
            .append($wrap)
            .append($div)
            .bind('keydown', onEscape);
        return dialog;
    }
})();
