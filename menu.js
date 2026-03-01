/**
 * menu.js – Menú lateral centralitzat per a PictoSuite
 * Genera el menú hamburguesa unificat i proporciona funcions compartides:
 *   obrirMenu, tancarMenu, toggleDarkMode, guardarApiKey,
 *   enviarSuggeriment, toggleApiKeys, apiCallWithFallback
 */
(function () {
    'use strict';

    // ── Funcions compartides ──────────────────────────────────────────────

    window.obrirMenu = function () {
        var m = document.getElementById('elMeuMenu');
        if (m) m.style.width = '280px';
    };

    window.tancarMenu = function () {
        var m = document.getElementById('elMeuMenu');
        if (m) m.style.width = '0';
    };

    window.toggleDarkMode = function (el) {
        document.body.classList.toggle('dark-mode', el.checked);
        localStorage.setItem('dark_mode', el.checked ? '1' : '0');
    };

    window.guardarApiKey = function (btn) {
        var geminiInp = document.getElementById('gemini-api-key');
        var orInp = document.getElementById('openrouter-api-key');
        if (geminiInp) localStorage.setItem('gemini_api_key', geminiInp.value.trim());
        if (orInp) localStorage.setItem('openrouter_api_key', orInp.value.trim());
        var orig = btn.textContent;
        btn.textContent = '✅ Desada!';
        setTimeout(function () { btn.textContent = orig; }, 2000);
    };

    /** Obre directament la interfície de redacció de Gmail al navegador */
    window.enviarSuggeriment = function () {
        window.open('https://mail.google.com/mail/?view=cm&fs=1&to=rrobles4@xtec.cat', '_blank');
    };

    /** Mostra/amaga la secció de claus API (revelació progressiva) */
    window.toggleApiKeys = function () {
        var section = document.getElementById('api-keys-section');
        var btn = document.getElementById('btn-activar-ia');
        if (!section) return;
        var visible = section.style.display !== 'none';
        section.style.display = visible ? 'none' : 'block';
        if (btn) btn.style.display = visible ? 'block' : 'none';
    };

    // ── Crida a la IA amb Fallback (Google AI Studio → OpenRouter) ────────

    window.apiCallWithFallback = async function (prompt, options) {
        options = options || {};
        var geminiKey = (localStorage.getItem('gemini_api_key') || '').trim();
        var openrouterKey = (localStorage.getItem('openrouter_api_key') || '').trim();
        var maxTokens = options.maxOutputTokens || 1000;
        var temperature = options.temperature !== undefined ? options.temperature : 0.7;

        if (geminiKey) {
            try {
                return await _callGemini(prompt, geminiKey, temperature, maxTokens);
            } catch (e) {
                var status = e.httpStatus || 0;
                if (openrouterKey && (status === 400 || status === 404 || status === 429 || status >= 500)) {
                    return await _callOpenRouter(prompt, openrouterKey, temperature, maxTokens);
                }
                throw e;
            }
        } else if (openrouterKey) {
            return await _callOpenRouter(prompt, openrouterKey, temperature, maxTokens);
        } else {
            var noKeyErr = new Error('no_key');
            throw noKeyErr;
        }
    };

    async function _callGemini(prompt, apiKey, temperature, maxTokens) {
        var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
        var resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: temperature, maxOutputTokens: maxTokens }
            })
        });
        if (!resp.ok) {
            var errData = await resp.json().catch(function () { return {}; });
            var msg = (errData.error && errData.error.message) ? errData.error.message : ('Error API Google: ' + resp.status);
            var e = new Error(msg);
            e.httpStatus = resp.status;
            throw e;
        }
        var data = await resp.json();
        var text = data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text;
        if (!text) throw new Error('Resposta buida de Google AI');
        return text.trim();
    }

    async function _callOpenRouter(prompt, apiKey, temperature, maxTokens) {
        var resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://rrobles4.github.io/PictoSuite',
                'X-Title': 'PictoSuite'
            },
            body: JSON.stringify({
                model: 'google/gemma-3-12b-it:free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens,
                temperature: temperature
            })
        });
        if (!resp.ok) {
            var errData = await resp.json().catch(function () { return {}; });
            var msg = (errData.error && errData.error.message) ? errData.error.message : ("Error API OpenRouter: " + resp.status);
            throw new Error(msg);
        }
        var data = await resp.json();
        var text = data.choices &&
            data.choices[0] &&
            data.choices[0].message &&
            data.choices[0].message.content;
        if (!text) throw new Error("Resposta buida d'OpenRouter");
        return text.trim();
    }

    // ── HTML del menú ─────────────────────────────────────────────────────

    function buildMenuHTML() {
        return '<button class="menu-btn no-print" id="btn-menu-principal" onclick="obrirMenu()">☰</button>' +
            '<div id="elMeuMenu" class="side-menu no-print">' +
            '<button class="close-btn" onclick="tancarMenu()">×</button>' +
            '<a href="index.html">🏠 Inici (PictoSuite)</a>' +
            '<a href="targetes.html">🃏 Targetes</a>' +
            '<a href="pictoxat.html">💬 PictoXat</a>' +
            '<a href="bingo.html">🎯 Bingo</a>' +
            '<hr style="width:80%;border:0;border-top:1px solid #eee;margin:15px auto;">' +
            '<div class="toggle-wrap">' +
            '<span style="font-size:16px;" data-i18n="mode_fosc">🌙 Mode Fosc</span>' +
            '<label class="toggle-switch">' +
            '<input type="checkbox" id="dark-mode-toggle" onchange="toggleDarkMode(this)">' +
            '<span class="toggle-slider"></span>' +
            '</label>' +
            '</div>' +
            '<div class="sidebar-section">' +
            '<span class="sidebar-label" data-i18n="idioma_ui">🌐 Idioma de l\'aplicació</span>' +
            '<select id="ui-lang-select" class="sidebar-input" onchange="canviarIdiomaInterficie(this.value)">' +
            '<option value="ca">Català</option>' +
            '<option value="es">Castellà</option>' +
            '<option value="en">English</option>' +
            '<option value="fr">Français</option>' +
            '<option value="ar">العربية</option>' +
            '<option value="zh">中文</option>' +
            '<option value="ur">اردو</option>' +
            '</select>' +
            '</div>' +
            '<div class="sidebar-section">' +
            '<button id="btn-activar-ia" onclick="toggleApiKeys()" style="background:#8e44ad;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;width:100%;font-size:0.9em;font-weight:bold;">🤖 Activa la IA!</button>' +
            '<div id="api-keys-section" style="display:none;">' +
            '<div style="margin-top:10px;">' +
            '<span class="sidebar-label" data-i18n="clau_api">🤖 Clau API Google AI Studio:</span>' +
            '<input type="password" id="gemini-api-key" class="sidebar-input" placeholder="AIza...">' +
            '<a href="https://aistudio.google.com/app/apikey" target="_blank" style="font-size:0.8em;color:var(--color-principal);display:block;margin-top:4px;text-align:center;" data-i18n="aconseguir_clau_google">👉 Aconseguir clau gratis de Google</a>' +
            '</div>' +
            '<div style="margin-top:10px;">' +
            '<span class="sidebar-label">🔗 Clau API OpenRouter:</span>' +
            '<input type="password" id="openrouter-api-key" class="sidebar-input" placeholder="sk-or-...">' +
            '<a href="https://openrouter.ai/keys" target="_blank" style="font-size:0.8em;color:var(--color-principal);display:block;margin-top:4px;text-align:center;" data-i18n="aconseguir_clau_openrouter">👉 Aconseguir clau gratis d\'OpenRouter</a>' +
            '</div>' +
            '<button class="sidebar-btn" onclick="guardarApiKey(this)" style="margin-top:8px;" data-i18n="desar_clau">💾 Desar claus</button>' +
            '</div>' +
            '</div>' +
            '<hr style="width:80%;border:0;border-top:1px solid #eee;margin:10px auto;">' +
            '<div class="sidebar-section">' +
            '<button onclick="tancarMenu();enviarSuggeriment();" style="background:#333;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;width:100%;font-size:0.9em;font-family:var(--font-titols,\'Fredoka\',sans-serif);" data-i18n="suggerencia">✉️ Tens alguna suggerència?</button>' +
            '</div>' +
            '</div>';
    }

    // ── CSS: el botó ☰ usa var(--color-principal) de cada pàgina ─────────

    function injectMenuStyles() {
        if (document.getElementById('menu-js-styles')) return;
        var style = document.createElement('style');
        style.id = 'menu-js-styles';
        style.textContent =
            '.menu-btn{background-color:var(--color-principal)!important;}' +
            '.menu-btn:hover{filter:brightness(1.1);}';
        document.head.appendChild(style);
    }

    // ── Inicialitzar menú ─────────────────────────────────────────────────

    function initMenu() {
        // Inserir HTML del menú al principi del body
        var tmp = document.createElement('div');
        tmp.innerHTML = buildMenuHTML();
        var body = document.body;
        while (tmp.firstChild) {
            body.insertBefore(tmp.firstChild, body.firstChild);
        }

        // Restaurar mode fosc
        if (localStorage.getItem('dark_mode') === '1') {
            document.body.classList.add('dark-mode');
            var toggle = document.getElementById('dark-mode-toggle');
            if (toggle) toggle.checked = true;
        }

        // Restaurar claus API
        var geminiKey = localStorage.getItem('gemini_api_key') || '';
        var openrouterKey = localStorage.getItem('openrouter_api_key') || '';
        if (geminiKey || openrouterKey) {
            var section = document.getElementById('api-keys-section');
            var activateBtn = document.getElementById('btn-activar-ia');
            if (section) section.style.display = 'block';
            if (activateBtn) activateBtn.style.display = 'none';
            var gInp = document.getElementById('gemini-api-key');
            var orInp = document.getElementById('openrouter-api-key');
            if (gInp && geminiKey) gInp.value = geminiKey;
            if (orInp && openrouterKey) orInp.value = openrouterKey;
        }

        // Restaurar idioma
        var lang = localStorage.getItem('ui_lang') || 'ca';
        var langSel = document.getElementById('ui-lang-select');
        if (langSel) langSel.value = lang;
        if (typeof canviarIdiomaInterficie === 'function') {
            canviarIdiomaInterficie(lang);
        }
    }

    // Injectar CSS immediatament
    if (document.head) {
        injectMenuStyles();
    } else {
        document.addEventListener('DOMContentLoaded', injectMenuStyles);
    }

    // Injectar HTML quan el DOM estigui llest
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMenu);
    } else {
        initMenu();
    }
}());
