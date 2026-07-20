// ========================================
// 麻雀精算ポイント計算機 - JavaScriptコア
// ========================================

// グローバル状態管理
let currentRules = {
    players: 4,
    genten: 25000,
    kaeshi: 30000,
    uma: "10-30",
    rounding: "5sha6nyu",
    sameScore: "wind",
    yakitori: 0,
    yakitoriEnabled: false
};

let calculatedResults = null;

// ストレージキー定数
const STORAGE_RULES_KEY = 'mj_calc_rules';
const STORAGE_HISTORY_KEY = 'mj_calc_history';
const STORAGE_PLAYER_NAMES_KEY = 'mj_player_names';

// ========== 初期化 ==========
window.addEventListener('DOMContentLoaded', () => {
    loadRulesFromStorage();
    initPlayerInputs();
    updateRuleDescription();
    loadHistory();
});

// ========== タブ切り替え ==========
function switchTab(tabId) {
    // タブ要素の管理
    const allSections = document.querySelectorAll('.content-section');
    const allButtons = document.querySelectorAll('.tab-btn');
    
    allSections.forEach(el => el.classList.remove('active'));
    allButtons.forEach(el => {
        el.setAttribute('aria-selected', 'false');
        el.classList.remove('active');
    });
    
    const activeSection = document.getElementById(tabId);
    if (activeSection) {
        activeSection.classList.add('active');
    }
    
    // ボタンのアクティブ状態を設定
    const tabMap = {
        'input-tab': 'tab-input',
        'rule-tab': 'tab-rule',
        'history-tab': 'tab-history'
    };
    
    const btnId = tabMap[tabId];
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.setAttribute('aria-selected', 'true');
        btn.classList.add('active');
    }
}

// ========== プレイヤー入力の動的生成 ==========
function initPlayerInputs() {
    const container = document.getElementById('player-inputs-container');
    if (!container) return;
    
    container.innerHTML = '';
    let count = parseInt(currentRules.players, 10);
    if (!Number.isInteger(count) || count < 3 || count > 4) {
        count = 4;
        currentRules.players = 4;
    }
    const winds = ['東', '南', '西', '北'];

    const savedNames = loadPlayerNamesFromStorage(count);
    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.setAttribute('data-player-id', i);
        
        const wind = winds[i];
        const defaultName = `プレイヤー${wind}`;
        const playerName = savedNames[i] || defaultName;
        const yakitoriCell = currentRules.yakitoriEnabled ? `
            <div class="player-cell-yakitori">
                <label class="yakitori-toggle" for="p-yakitori-${i}">
                    <input type="checkbox" id="p-yakitori-${i}" class="p-yakitori-input" aria-label="プレイヤー${wind}の焼き鳥" />
                    <span class="yakitori-icon" aria-hidden="true">🐔</span>
                    <span class="yakitori-text">焼き鳥</span>
                </label>
            </div>
        ` : '';
        row.innerHTML = `
            <div class="player-cell-wind" aria-label="座">${wind}</div>
            <div class="player-cell-name">
                <input 
                    type="text" 
                    id="p-name-${i}" 
                    class="player-name-input"
                    value="${escapeHtml(playerName)}" 
                    placeholder="プレイヤー名"
                    aria-label="プレイヤー${wind}の名前"
                >
            </div>
            <div class="player-cell-score">
                <input 
                    type="text" 
                    id="p-score-${i}" 
                    class="p-score-input formatted-number"
                    value="" 
                    placeholder="持点(100点単位)" 
                    inputmode="numeric"
                    pattern="[0-9,]*"
                    aria-label="プレイヤー${wind}の最終持ち点"
                >
            </div>
            ${yakitoriCell}
        `;
        container.appendChild(row);
    }
    
    setupFormattedInputs();
    setupRealtimeValidation();
    updateYakitoriCheckboxes();
    setupPlayerNamePersistence();
}

function loadPlayerNamesFromStorage(count) {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_PLAYER_NAMES_KEY) || '{}');
        if (Array.isArray(saved[count])) {
            return saved[count];
        }
    } catch (error) {
        console.error('プレイヤー名読み込みエラー:', error);
    }
    return [];
}

function savePlayerNamesToStorage(names) {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_PLAYER_NAMES_KEY) || '{}');
        saved[currentRules.players] = names;
        localStorage.setItem(STORAGE_PLAYER_NAMES_KEY, JSON.stringify(saved));
    } catch (error) {
        console.error('プレイヤー名保存エラー:', error);
    }
}

function setupPlayerNamePersistence() {
    const inputs = document.querySelectorAll('.player-name-input');
    inputs.forEach(input => {
        input.removeEventListener('input', handlePlayerNameInput);
        input.addEventListener('input', handlePlayerNameInput);
    });
}

function handlePlayerNameInput() {
    const names = Array.from(document.querySelectorAll('.player-name-input')).map(input => input.value.trim());
    savePlayerNamesToStorage(names);
}

function formatNumberWithCommas(value) {
    const str = String(value);
    const match = str.match(/^(-?)(\d+)$/);
    if (!match) return str;
    const sign = match[1];
    const digits = match[2];
    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function parseFormattedNumber(value) {
    if (value == null) return NaN;
    const cleaned = String(value).replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned === '+') return NaN;
    return Number(cleaned);
}

function handleFormattedNumberInput(event) {
    const input = event.target;
    const raw = input.value;
    const negative = raw.startsWith('-');
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits === '') {
        input.value = negative ? '-' : '';
        return;
    }
    input.value = formatNumberWithCommas((negative ? '-' : '') + digits);
}

function setupFormattedInputs() {
    const inputs = document.querySelectorAll('.formatted-number');
    inputs.forEach(input => {
        input.removeEventListener('input', handleFormattedNumberInput);
        input.addEventListener('input', handleFormattedNumberInput);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


function togglePlayerCount() {
    const select = document.getElementById('rule-players');
    if (!select) return;
    
    currentRules.players = parseInt(select.value);
    initPlayerInputs();
}

function updateYakitoriCheckboxes() {
    if (!currentRules.yakitoriEnabled) return;

    const count = parseInt(currentRules.players, 10);
    for (let i = 0; i < count; i++) {
        const scoreEl = document.getElementById(`p-score-${i}`);
        const yakitoriCell = document.querySelector(`#p-yakitori-${i}`)?.closest('.player-cell-yakitori');
        if (!scoreEl || !yakitoriCell) continue;

        const score = parseFormattedNumber(scoreEl.value);
        const checkbox = document.getElementById(`p-yakitori-${i}`);
        if (Number.isFinite(score) && score >= currentRules.genten) {
            yakitoriCell.classList.add('yakitori-hidden');
            if (checkbox) {
                checkbox.checked = false;
                checkbox.disabled = true;
            }
        } else {
            yakitoriCell.classList.remove('yakitori-hidden');
            if (checkbox) {
                checkbox.disabled = false;
            }
        }
    }
}

// ========== リアルタイムバリデーション ==========
function setupRealtimeValidation() {
    const inputs = document.querySelectorAll('.p-score-input');
    
    inputs.forEach(input => {
        input.removeEventListener('input', handleScoreInput);
        input.addEventListener('input', handleScoreInput);
    });
    
    validateScores();
}

function handleScoreInput() {
    validateScores();
    updateYakitoriCheckboxes();
}

function validateScores() {
    const count = parseInt(currentRules.players);
    const targetTotal = currentRules.genten * count;
    
    let filledCount = 0;
    let currentTotal = 0;
    const missingIndices = [];
    const invalidIndices = [];

    document.querySelectorAll('.p-score-input').forEach(input => {
        input.placeholder = '持点(100点単位)';
    });

    for (let i = 0; i < count; i++) {
        const input = document.getElementById(`p-score-${i}`);
        if (!input) continue;

        const rawValue = input.value.trim();
        if (rawValue === '') {
            missingIndices.push(i);
            continue;
        }

        const scoreValue = parseFormattedNumber(rawValue);
        if (!Number.isFinite(scoreValue)) {
            invalidIndices.push(i);
            continue;
        }

        filledCount++;
        currentTotal += scoreValue;
    }

    const indicator = document.getElementById('validation-indicator');
    const calcBtn = document.getElementById('calc-btn');
    if (!indicator || !calcBtn) return;

    if (missingIndices.length === 1 && invalidIndices.length === 0) {
        const missingIndex = missingIndices[0];
        const remaining = targetTotal - currentTotal;
        const input = document.getElementById(`p-score-${missingIndex}`);
        if (input) {
            input.placeholder = `残り補完値: ${remaining.toLocaleString()}点`;
        }
        indicator.className = "indicator success";
        indicator.textContent = `最後の1枠に残り点数を入力してください。補完値: ${remaining.toLocaleString()}点`;
        calcBtn.disabled = false;
        calcBtn.style.opacity = "1";
        return;
    }

    if (invalidIndices.length > 0) {
        indicator.className = "indicator error";
        indicator.textContent = `無効な入力があります。数字のみ入力してください。`;
        calcBtn.disabled = true;
        calcBtn.style.opacity = "0.6";
        return;
    }

    if (filledCount === count) {
        if (currentTotal === targetTotal) {
            indicator.className = "indicator success";
            indicator.textContent = `✓ 合計点数チェックOK: ${currentTotal.toLocaleString()}点`;
            calcBtn.disabled = false;
            calcBtn.style.opacity = "1";
        } else {
            const diff = targetTotal - currentTotal;
            indicator.className = "indicator error";
            indicator.textContent = `✗ 点数が合いません: 合計 ${currentTotal.toLocaleString()}点 (目標 ${targetTotal.toLocaleString()}点 / 差額 ${diff}点)`;
            calcBtn.disabled = true;
            calcBtn.style.opacity = "0.6";
        }
    } else {
        indicator.className = "indicator error";
        indicator.textContent = `全員の点数を入力してください (合計目標: ${targetTotal.toLocaleString()}点)`;
        calcBtn.disabled = true;
        calcBtn.style.opacity = "0.6";
    }
}

// ========== ルール設定の管理 ==========
function saveRules(event) {
    if (event) event.preventDefault();
    
    try {
        currentRules.players = parseInt(document.getElementById('rule-players')?.value || 4);
        currentRules.genten = 25000;
        currentRules.kaeshi = parseInt(document.getElementById('rule-kaeshi')?.value || 30000);
        currentRules.uma = document.getElementById('rule-uma')?.value || "10-30";
        currentRules.rounding = document.getElementById('rule-rounding')?.value || "5sha6nyu";
        currentRules.sameScore = document.getElementById('rule-same-score')?.value || "wind";
        currentRules.yakitoriEnabled = document.getElementById('rule-yakitori-enabled')?.checked || false;
        currentRules.yakitori = parseInt(document.getElementById('rule-yakitori')?.value || 0);

        localStorage.setItem(STORAGE_RULES_KEY, JSON.stringify(currentRules));
        updateRuleDescription();
        initPlayerInputs();
        
        alert('✓ ルール設定をブラウザに保存しました。');
        switchTab('input-tab');
    } catch (error) {
        console.error('ルール保存エラー:', error);
        alert('ルール保存に失敗しました。');
    }
}

function loadRulesFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_RULES_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            currentRules = { ...currentRules, ...parsed };
            currentRules.genten = 25000;
            
            // UI要素を更新
            const ruleInputs = {
                'rule-players': currentRules.players,
                'rule-genten': currentRules.genten,
                'rule-kaeshi': currentRules.kaeshi,
                'rule-uma': currentRules.uma,
                'rule-rounding': currentRules.rounding,
                'rule-same-score': currentRules.sameScore,
                'rule-yakitori': currentRules.yakitori
            };
            
            Object.entries(ruleInputs).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.value = value;
            });
            const yakitoriEnabledInput = document.getElementById('rule-yakitori-enabled');
            if (yakitoriEnabledInput) yakitoriEnabledInput.checked = currentRules.yakitoriEnabled;
            updateYakitoriInputState();
        }
    } catch (error) {
        console.error('ルール読み込みエラー:', error);
    }
}

function normalizeYakitoriValue(value) {
    const num = Number(value);
    if (Number.isNaN(num) || num === 0) return 0;
    return num / 100;
}

function updateRuleDescription() {
    const desc = document.getElementById('current-rule-desc');
    if (desc) {
        let description = `${currentRules.players}人打ち / ${currentRules.genten.toLocaleString()}点持 ${currentRules.kaeshi.toLocaleString()}点返 / ウマ(${currentRules.uma})`;
        if (currentRules.yakitoriEnabled) {
            const yakitoriPt = normalizeYakitoriValue(currentRules.yakitori);
            description += ` / 焼き鳥 ${yakitoriPt}pt`;
        }
        desc.textContent = description;
    }
}

function toggleYakitoriOption() {
    const enabledInput = document.getElementById('rule-yakitori-enabled');
    const yakitoriInput = document.getElementById('rule-yakitori');
    if (!enabledInput || !yakitoriInput) return;
    yakitoriInput.disabled = !enabledInput.checked;
}

function updateYakitoriInputState() {
    const enabledInput = document.getElementById('rule-yakitori-enabled');
    const yakitoriInput = document.getElementById('rule-yakitori');
    if (!enabledInput || !yakitoriInput) return;
    yakitoriInput.disabled = !enabledInput.checked;
}

// ========== 端数処理ロジック ==========
function roundPoint(rawPoint, method) {
    const round1 = value => Math.round(value * 10) / 10;
    const trunc1 = value => (value >= 0 ? Math.floor(value * 10) : Math.ceil(value * 10)) / 10;

    if (method === 'keep' || method === 'shishagonyu') {
        return round1(rawPoint);
    }

    if (method === 'kirisute') {
        return trunc1(rawPoint);
    }

    if (method === '5sha6nyu') {
        const scaled = rawPoint * 100;
        const secondDecimal = Math.abs(Math.trunc(scaled)) % 10;
        if (secondDecimal >= 6) {
            return (rawPoint >= 0 ? Math.ceil(rawPoint * 10) : Math.floor(rawPoint * 10)) / 10;
        }
        return (rawPoint >= 0 ? Math.floor(rawPoint * 10) : Math.ceil(rawPoint * 10)) / 10;
    }

    return round1(rawPoint);
}

// ========== 精算ポイント計算コア ==========
function calculateScoresHandler(event) {
    if (event) event.preventDefault();
    
    try {
        const count = currentRules.players;
        const targetTotal = currentRules.genten * count;
        const missingIndices = [];
        const invalidIndices = [];
        let currentTotal = 0;

        for (let i = 0; i < count; i++) {
            const scoreEl = document.getElementById(`p-score-${i}`);
            if (!scoreEl) continue;

            const rawValue = scoreEl.value.trim();
            if (rawValue === '') {
                missingIndices.push(i);
                continue;
            }

            if (!/^-?\d+$/.test(rawValue)) {
                invalidIndices.push(i);
                continue;
            }

            currentTotal += Number(rawValue);
        }

        if (invalidIndices.length > 0) {
            alert('無効な点数が入力されています。数字のみを入力してください。');
            return;
        }

        if (missingIndices.length > 1) {
            alert('点数が未入力のプレイヤーが複数あります。全員の点数を入力してください。');
            return;
        }

        if (missingIndices.length === 1) {
            const missingIndex = missingIndices[0];
            const remaining = targetTotal - currentTotal;
            const missingEl = document.getElementById(`p-score-${missingIndex}`);
            if (missingEl) {
                missingEl.value = remaining;
            }
        }

        let playersData = [];

        for (let i = 0; i < count; i++) {
            const nameEl = document.getElementById(`p-name-${i}`);
            const scoreEl = document.getElementById(`p-score-${i}`);
            if (!scoreEl) continue;

            const score = parseFormattedNumber(scoreEl.value);
            if (!Number.isFinite(score)) {
                alert(`プレイヤー${i + 1}の点数が無効です。`);
                return;
            }

            const yakitoriEl = document.getElementById(`p-yakitori-${i}`);
            playersData.push({
                id: i,
                name: nameEl?.value || `プレイヤー${i + 1}`,
                score: score,
                isYakitori: yakitoriEl?.checked || false,
                initialIndex: i
            });
        }

        playersData = calculateScores(playersData, {
            genten: currentRules.genten,
            kaeshi: currentRules.kaeshi,
            umaKey: currentRules.uma,
            rounding: currentRules.rounding,
            sameScore: currentRules.sameScore,
            yakitoriEnabled: currentRules.yakitoriEnabled,
            yakitori: currentRules.yakitori
        });

        // 結果表示
        displayResults(playersData);
        calculatedResults = playersData;

    } catch (error) {
        console.error('計算エラー:', error);
        alert('計算処理中にエラーが発生しました。');
    }
}

function getUmaArray(count, umaKey) {
    const uma = umaKey || currentRules.uma;
    if (count === 3) {
        if (uma === '5-10') return [10, 0, -10];
        if (uma === '10-20') return [20, 0, -20];
        if (uma === '10-30') return [30, 0, -30];
        if (uma === '20-30') return [30, 0, -30];
    } else {
        if (uma === '5-10') return [10, 5, -5, -10];
        if (uma === '10-20') return [20, 10, -10, -20];
        if (uma === '10-30') return [30, 10, -10, -30];
        if (uma === '20-30') return [30, 20, -20, -30];
    }
    return Array(count).fill(0);
}

function assignUmaSplit(playersData, umaArray) {
    let rankGroups = {};
    playersData.forEach(p => {
        if (!rankGroups[p.rank]) rankGroups[p.rank] = [];
        rankGroups[p.rank].push(p);
    });

    let idxPointer = 0;
    Object.keys(rankGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(r => {
        const group = rankGroups[r];
        let sumUma = 0;
        for (let k = 0; k < group.length; k++) {
            sumUma += umaArray[idxPointer + k] || 0;
        }
        const avgUma = sumUma / group.length;
        group.forEach(p => { p.assignedUma = avgUma; });
        idxPointer += group.length;
    });
}

function calculateScores(players, { genten = 25000, kaeshi = 30000, umaKey = '5-10', rounding = '5sha6nyu', sameScore = 'wind', yakitoriEnabled = false, yakitori = 0 } = {}) {
    const count = players.length;
    const umaArray = getUmaArray(count, umaKey);
    const okaPoints = ((kaeshi - genten) * count) / 1000;

    const sortedPlayers = players
        .map((p, index) => ({ ...p, initialIndex: index }))
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.initialIndex - b.initialIndex;
        });

    if (sameScore === 'wind') {
        sortedPlayers.forEach((player, index) => {
            player.rank = index + 1;
        });
    } else {
        let currentRank = 1;
        sortedPlayers.forEach((player, index) => {
            if (index > 0 && player.score < sortedPlayers[index - 1].score) {
                currentRank = index + 1;
            }
            player.rank = currentRank;
        });
    }

    if (sameScore === 'split') {
        assignUmaSplit(sortedPlayers, umaArray);
    } else {
        sortedPlayers.forEach((player, index) => {
            player.assignedUma = umaArray[index] || 0;
        });
    }

    if (yakitoriEnabled && yakitori && yakitori !== 0) {
        const penaltyValue = normalizeYakitoriValue(yakitori);
        const yakitoriPlayers = sortedPlayers.filter(p => p.isYakitori);
        const nonYakitoriPlayers = sortedPlayers.filter(p => !p.isYakitori);
        if (yakitoriPlayers.length > 0 && yakitoriPlayers.length < sortedPlayers.length) {
            const totalPenalty = penaltyValue * yakitoriPlayers.length;
            const payoutPerNonYakitori = totalPenalty / nonYakitoriPlayers.length;
            yakitoriPlayers.forEach(p => {
                p.yakitoriAdjustment = -penaltyValue;
            });
            nonYakitoriPlayers.forEach(p => {
                p.yakitoriAdjustment = payoutPerNonYakitori;
            });
        } else {
            sortedPlayers.forEach(p => {
                p.yakitoriAdjustment = 0;
            });
        }
    } else {
        sortedPlayers.forEach(p => {
            p.yakitoriAdjustment = 0;
        });
    }

    sortedPlayers.forEach((player, index) => {
        const baseValue = (player.score - kaeshi) / 1000;
        const rawValue = baseValue + player.assignedUma + (index === 0 ? okaPoints : 0) + (player.yakitoriAdjustment || 0);
        player.pt = roundPoint(rawValue, rounding);
    });

    if (sortedPlayers.length > 0) {
        const lastIndex = sortedPlayers.length - 1;
        const totalExceptLast = sortedPlayers
            .slice(0, lastIndex)
            .reduce((sum, player) => sum + player.pt, 0);
        sortedPlayers[lastIndex].pt = roundPoint(-totalExceptLast, rounding);
    }

    return sortedPlayers.map(player => ({
        id: player.id,
        name: player.name,
        score: player.score,
        rank: player.rank,
        pt: player.pt
    }));
}

function calculateScoresFromPlayers(players, options = {}) {
    return calculateScores(players, options);
}

function calculatePoints(playersData) {
    const count = currentRules.players;
    const totalOkaPoints = ((currentRules.kaeshi - currentRules.genten) * count) / 1000;

    playersData.forEach((p, idx) => {
        // 基本スコア計算
        let rawSoten = (p.score - currentRules.kaeshi) / 1000;
        p.pt = rawSoten + p.assignedUma;

        // オカ（トップ賞）の配分
        if (currentRules.sameScore === 'split') {
            const topCount = playersData.filter(x => x.rank === 1).length;
            if (p.rank === 1) p.pt += totalOkaPoints / topCount;
        } else {
            if (idx === 0) p.pt += totalOkaPoints;
        }

        // 端数処理
        p.pt = roundPoint(p.pt, currentRules.rounding);
    });

    // ゼロサム微調整（誤差を最下位に集約）
    if (currentRules.rounding !== 'keep') {
        let totalPt = playersData.reduce((sum, p) => sum + p.pt, 0);
        if (Math.abs(totalPt) > 0.01) {
            playersData[count - 1].pt = 
                Math.round((playersData[count - 1].pt - totalPt) * 10) / 10;
        }
    }
}

function displayResults(playersData) {
    const tbody = document.getElementById('result-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    playersData.forEach((p) => {
        const tr = document.createElement('tr');
        const ptClass = p.pt > 0.01 ? 'score-plus' : (p.pt < -0.01 ? 'score-minus' : '');
        const ptStr = p.pt > 0 ? `+${p.pt.toFixed(1)}` : p.pt.toFixed(1);
        
        tr.innerHTML = `
            <td class="rank-${p.rank}">${p.rank}位</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${p.score.toLocaleString()}</td>
            <td class="${ptClass}">${ptStr}</td>
        `;
        tbody.appendChild(tr);
    });

    generateShareText(playersData);
    const resultArea = document.getElementById('result-area');
    if (resultArea) {
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }
}

function generateShareText(data) {
    const dateStr = new Date().toLocaleDateString('ja-JP');
    let text = `【麻雀対局結果】 ${dateStr}\n`;
    text += `ルール: ${currentRules.players}人打ち / ${currentRules.genten.toLocaleString()}持 ${currentRules.kaeshi.toLocaleString()}返\n`;
    text += `${'─'.repeat(30)}\n`;
    data.forEach(p => {
        const ptStr = p.pt > 0 ? `+${p.pt.toFixed(1)}` : p.pt.toFixed(1);
        text += `${p.rank}位: ${p.name} ${p.score.toLocaleString()}点 (${ptStr})\n`;
    });
    text += `${'─'.repeat(30)}`;
    
    const shareBox = document.getElementById('share-text-box');
    if (shareBox) {
        shareBox.textContent = text;
    }
}

function copyShareText() {
    const text = document.getElementById('share-text-box')?.textContent;
    if (!text) {
        alert('コピーするテキストがありません。');
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        alert('✓ 結果テキストをクリップボードにコピーしました！');
    }).catch(err => {
        console.error('コピーエラー:', err);
        alert('コピーに失敗しました。お手数ですが手動でコピーしてください。');
    });
}

// ========== 履歴管理 ==========
function saveToHistory() {
    if (!calculatedResults) {
        alert('計算結果がありません。');
        return;
    }

    try {
        const history = JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY) || '[]');
        const newRecord = {
            id: Date.now(),
            date: new Date().toLocaleString('ja-JP'),
            playersCount: currentRules.players,
            rulesDesc: `${currentRules.genten}持-${currentRules.kaeshi}返 / ウマ ${currentRules.uma}`,
            scores: calculatedResults.map(p => ({
                name: p.name,
                score: p.score,
                pt: p.pt,
                rank: p.rank
            }))
        };

        history.unshift(newRecord);
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
        loadHistory();
        alert('✓ 対局履歴に保存しました。');
        switchTab('history-tab');
    } catch (error) {
        console.error('履歴保存エラー:', error);
        alert('履歴保存に失敗しました。');
    }
}

function loadHistory() {
    try {
        const history = JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY) || '[]');
        const container = document.getElementById('history-list');
        const summary = document.getElementById('history-summary');
        const totalsPanel = document.getElementById('history-totals');
        if (!container || !summary || !totalsPanel) return;
        
        container.innerHTML = '';
        totalsPanel.innerHTML = '';
        summary.textContent = `対局数: ${history.length}件`;

        if (history.length === 0) {
            totalsPanel.innerHTML = '<div style="color:var(--text-muted); padding:1rem; border:1px dashed var(--border-color); border-radius:8px;">総合収支は履歴保存後に表示されます</div>';
            container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem 1rem;">📭 履歴はありません</p>';
            return;
        }

        const totals = computeHistoryTotals(history);
        if (totals.length > 0) {
            totalsPanel.innerHTML = totals.map(([name, total], index) => {
                const totalStr = total > 0 ? `+${total.toFixed(1)}` : total.toFixed(1);
                const totalClass = total > 0 ? 'score-plus' : (total < 0 ? 'score-minus' : '');
                return `
                    <div class="history-total-card">
                        <div class="history-total-rank">${index + 1}</div>
                        <div class="history-total-body">
                            <div class="history-total-name">${escapeHtml(name)}</div>
                            <div class="history-total-value ${totalClass}">${totalStr}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            let scoreLine = '<div class="history-scores">';
            item.scores.forEach(s => {
                const ptStr = s.pt > 0 ? `+${s.pt.toFixed(1)}` : s.pt.toFixed(1);
                scoreLine += `
                    <div class="history-player">
                        <strong>${escapeHtml(s.name)}</strong><br>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${s.score.toLocaleString()}点</span><br>
                        <span class="${s.pt > 0 ? 'score-plus' : (s.pt < 0 ? 'score-minus' : '')}" style="font-weight:bold;">${ptStr}</span>
                    </div>
                `;
            });
            scoreLine += '</div>';

            div.innerHTML = `
                <div class="history-meta">
                    <span>📅 ${item.date} (${item.playersCount}人打)</span>
                    <span>${item.rulesDesc}</span>
                </div>
                ${scoreLine}
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('履歴読み込みエラー:', error);
    }
}

function computeHistoryTotals(history) {
    const totals = {};
    history.forEach(item => {
        item.scores.forEach(score => {
            const name = score.name || '未設定';
            totals[name] = (totals[name] || 0) + (Number(score.pt) || 0);
        });
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

function clearHistory() {
    if (confirm('⚠️  すべての対局履歴を消去してもよろしいですか？')) {
        try {
            localStorage.removeItem(STORAGE_HISTORY_KEY);
            loadHistory();
            alert('✓ 履歴を消去しました。');
        } catch (error) {
            console.error('履歴削除エラー:', error);
            alert('履歴削除に失敗しました。');
        }
    }
}

