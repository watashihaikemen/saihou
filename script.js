document.addEventListener('DOMContentLoaded', () => {
    // --- データ定義 ---
    const CONCENTRATION_LEVELS = [0, 50, 51, 54, 55, 58, 61, 62, 65, 68, 68, 71, 74, 74, 77, 79, 82, 82, 85, 88, 88, 91, 94, 94, 97, 100, 100, 103, 105, 108, 108, 111, 112, 112, 114, 118, 121, 122, 122, 124, 128, 131, 133, 136, 138, 138, 141, 141, 143, 146, 148, 151, 151, 153, 156, 158, 161, 161, 163, 166, 168, 170, 170, 172, 174, 176, 179, 181, 183, 185, 187, 188, 190, 192, 194, 196, 196, 196, 196, 196, 196];
    const NEEDLE_DATA = { copper: { conc: 0, crit: [0.010, 0.011, 0.012, 0.020] }, iron: { conc: 10, crit: [0.015, 0.016, 0.017, 0.025] }, silver: { conc: 15, crit: [0.020, 0.021, 0.022, 0.030] }, platinum: { conc: 25, crit: [0.025, 0.026, 0.027, 0.035] }, super: { conc: 35, crit: [0.030, 0.031, 0.032, 0.040] }, miracle: { conc: 50, crit: [0.033, 0.034, 0.035, 0.043] }, light: { conc: 45, crit: [0.036, 0.037, 0.038, 0.046] } };
    const SKILLS = { 'kagen': { key: 'kagen', name: 'かげんぬい', cost: 10, level: 3 }, 'normal': { key: 'normal', name: '普通に縫う', cost: 5, level: 1 }, 'double': { key: 'double', name: '2倍ぬい', cost: 9, level: 13 }, 'triple': { key: 'triple', name: '3倍縫い', cost: 12, level: 33 }, 'nerai': { key: 'nerai', name: 'ねらいぬい', cost: 16, level: 23 }, 'yoko': { key: 'yoko', name: 'ヨコぬい', cost: 8, level: 2 }, 'taki': { key: 'taki', name: '滝のぼり', cost: 8, level: 5 }, 'tasuki': { key: 'tasuki', name: 'たすきぬい', cost: 7, level: 7 }, 'gyaku-tasuki': { key: 'gyaku-tasuki', name: '逆たすきぬい', cost: 7, level: 25 }, 'suihei': { key: 'suihei', name: '水平ぬい', cost: 10, level: 15 }, 'otaki': { key: 'otaki', name: '大滝のぼり', cost: 10, level: 19 }, };
    const SEWING_VALUES = { normal: { kagen: 7.5, normal: 15 }, weak: { kagen: 3.5, normal: 7 }, strong: { kagen: 11, normal: 22 }, strongest: { kagen: 15, normal: 30 } };
    const INITIAL_GRID = [95, 40, 95, 60, 60, 60, 75, 40, 75];
    const CELL_NAMES = ["上段左", "上段中", "上段右", "中段左", "中段中", "中段右", "下段左", "下段中", "下段右"];
    
    let state = {};

    // --- DOM要素 ---
    const setupArea = document.getElementById('setup-area');
    const mainTool = document.getElementById('main-tool');
    const startButton = document.getElementById('start-button');
    const calculateNextButton = document.getElementById('calculate-next-button');
    const resetButton = document.getElementById('reset-button');
    const sewingGridEl = document.getElementById('sewing-grid');
    
    // --- 状態保存・読込 ---
    const saveState = () => localStorage.setItem('sewingToolState', JSON.stringify(state));
    const loadState = () => {
        const savedState = localStorage.getItem('sewingToolState');
        if (savedState) {
            state = JSON.parse(savedState);
            return true;
        }
        return false;
    };
    const resetState = () => {
        localStorage.removeItem('sewingToolState');
        location.reload();
    };

    // --- 初期化処理 ---
    const initialize = () => {
        const level = parseInt(document.getElementById('player-level').value);
        const needle = document.getElementById('sewing-needle').value;
        const stars = parseInt(document.getElementById('needle-stars').value);
        const maxConcentration = CONCENTRATION_LEVELS[level] + NEEDLE_DATA[needle].conc;

        state = {
            level, needle, stars,
            maxConcentration,
            currentConcentration: maxConcentration,
            baseCritRate: NEEDLE_DATA[needle].crit[stars],
            turn: 1,
            clothCondition: 'normal',
            gridValues: [...INITIAL_GRID],
            neraiAttempts: 0,
            neraiSuccesses: 0,
        };
        startTool();
    };

    const startTool = () => {
        mainTool.classList.remove('hidden');
        setupArea.classList.add('hidden');
        renderUI();
        runCalculationAndDisplay();
        saveState();
    };

    // --- UI更新 ---
    const renderUI = () => {
        document.getElementById('max-concentration').textContent = state.maxConcentration;
        document.getElementById('current-concentration').value = state.currentConcentration;
        document.getElementById('base-crit-rate').textContent = (state.baseCritRate * 100).toFixed(1);
        document.getElementById('current-turn').value = state.turn;
        document.getElementById('cloth-condition').value = state.clothCondition;

        sewingGridEl.innerHTML = '';
        state.gridValues.forEach((val, i) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            const input = document.createElement('input');
            input.type = 'number';
            input.value = val;
            input.dataset.index = i;
            cell.appendChild(input);
            sewingGridEl.appendChild(cell);
        });
        
        updateRegenerationNotice();
        updateCritTrackerUI();
    };

    const updateFromUI = () => {
        state.currentConcentration = parseInt(document.getElementById('current-concentration').value);
        state.turn = parseInt(document.getElementById('current-turn').value);
        state.clothCondition = document.getElementById('cloth-condition').value;
        document.querySelectorAll('#sewing-grid input').forEach(input => {
            const index = parseInt(input.dataset.index);
            state.gridValues[index] = parseInt(input.value) || 0;
        });
    };

    // --- 計算ロジック ---
    const runCalculationAndDisplay = () => {
        const bestAction = findBestAction();
        const suggestionText = document.getElementById('suggestion-text');
        
        if (bestAction.score === Infinity) {
            suggestionText.innerHTML = "集中力が足りないか、有効な手がありません。仕上げを検討してください。";
        } else {
             suggestionText.innerHTML = `<strong>${bestAction.skillName}</strong> を <strong>${bestAction.targetName}</strong> に使うのがおすすめです。<br>(集中力消費: ${bestAction.cost})`;
        }
        updateRegenerationNotice();
    };
    
    const calculateExpectedOutcome = (skillKey, indices) => {
        const tempGrid = [...state.gridValues];
        let totalReduction = 0;

        if (indices.some(index => tempGrid[index] <= 0)) {
            return { expectedGrid: null, expectedReduction: 0 };
        }
        
        const baseSewValue = SEWING_VALUES[state.clothCondition].normal;
        let sewPower = baseSewValue;

        switch(skillKey) {
            case 'kagen':
                sewPower = SEWING_VALUES[state.clothCondition].kagen;
                break;
            case 'double':
                sewPower *= 2;
                break;
            case 'triple':
                sewPower *= 3;
                break;
        }

        indices.forEach(index => {
            const originalValue = tempGrid[index];
            if (skillKey === 'nerai') {
                const critRate = state.baseCritRate + 0.20;
                const normalVal = originalValue - sewPower;
                const critVal = 0;
                const expectedValue = (normalVal * (1 - critRate)) + (critVal * critRate);
                
                totalReduction += originalValue - expectedValue;
                tempGrid[index] = expectedValue;
            } else {
                const reduction = Math.min(originalValue, sewPower);
                tempGrid[index] -= sewPower;
                totalReduction += reduction;
            }
        });

        return { expectedGrid: tempGrid, expectedReduction: totalReduction };
    };
    
    const findBestAction = () => {
        let bestAction = { score: Infinity };
        const totalValue = state.gridValues.reduce((sum, val) => sum + (val > 0 ? val : 0), 0);

        for (const skillKey in SKILLS) {
            const skill = SKILLS[skillKey];
            if (state.level < skill.level || state.currentConcentration < skill.cost) continue;

            const targets = getTargetsForSkill(skillKey);
            
            for (const target of targets) {
                const { expectedGrid, expectedReduction } = calculateExpectedOutcome(skillKey, target.indices);
                if (expectedGrid === null) continue;

                let score = 0;

                score += expectedGrid.reduce((sum, val) => sum + Math.abs(val), 0);
                score += expectedGrid.reduce((sum, val) => sum + (val < 0 ? Math.abs(val) * 10 : 0), 0);

                if (skill.cost > 0) {
                    const efficiency = expectedReduction / skill.cost;
                    if (efficiency < 1.5) score += 10;
                    if (efficiency < 1.0) score += 10;
                }
                
                if (state.clothCondition === 'weak') {
                    const isRangeAttack = ['yoko', 'taki', 'tasuki', 'gyaku-tasuki', 'suihei', 'otaki'].includes(skill.key);
                    if (isRangeAttack) {
                        score += 30; 
                    }
                }

                // ▼▼▼ 改善点: 「弱い布」での高倍率特技に、さらに大きなペナルティを追加 ▼▼▼
                switch (skill.key) {
                    case 'nerai':
                        const targetValue = state.gridValues[target.indices[0]];
                        if (targetValue < 15 || targetValue > 40) score += 50;
                        if (state.clothCondition === 'weak') score += 40;
                        if (state.currentConcentration > state.maxConcentration * 0.6) score += 20;
                        break;
                    case 'double': // 2倍ぬいも評価対象に
                    case 'triple':
                        // 「弱い」布で使うのは最悪手なので、極めて大きなペナルティ
                        if (state.clothCondition === 'weak') {
                            score += 50;
                        }
                        // 威力が過剰な場合もペナルティ
                        if (state.gridValues[target.indices[0]] < (skill.key === 'triple' ? 45 : 30)) {
                             score += 20;
                        }
                        break;
                    case 'kagen':
                        if (state.gridValues[target.indices[0]] < 15) score -= 5;
                        break;
                    case 'yoko': case 'taki': case 'tasuki': case 'gyaku-tasuki': case 'suihei': case 'otaki':
                        if (totalValue > 300) score -= 15;
                        break;
                }

                if (score < bestAction.score) {
                    bestAction = {
                        score: score,
                        skillName: skill.name,
                        targetName: target.name,
                        cost: skill.cost,
                    };
                }
            }
        }
        return bestAction;
    };

    const getTargetsForSkill = (skillKey) => {
        const targets = [];
        const isTargetable = (index) => state.gridValues[index] > 0;

        if (['kagen', 'normal', 'double', 'triple', 'nerai'].includes(skillKey)) {
            for (let i = 0; i < 9; i++) if (isTargetable(i)) targets.push({ name: CELL_NAMES[i], indices: [i] });
        } else if (skillKey === 'yoko') {
            [0, 1, 3, 4, 6, 7].forEach(i => { if(isTargetable(i) && isTargetable(i+1)) targets.push({ name: `${CELL_NAMES[i]}と${CELL_NAMES[i+1]}`, indices: [i, i+1] })});
        } else if (skillKey === 'taki') {
            [0, 1, 2, 3, 4, 5].forEach(i => { if(isTargetable(i) && isTargetable(i+3)) targets.push({ name: `${CELL_NAMES[i]}と${CELL_NAMES[i+3]}`, indices: [i, i+3] })});
        } else if (skillKey === 'tasuki') {
            [1, 2, 4, 5].forEach(i => { if(isTargetable(i) && isTargetable(i+2)) targets.push({ name: `${CELL_NAMES[i]}と${CELL_NAMES[i+2]}`, indices: [i, i+2] })});
        } else if (skillKey === 'gyaku-tasuki') {
             [0, 1, 3, 4].forEach(i => { if(isTargetable(i) && isTargetable(i+4)) targets.push({ name: `${CELL_NAMES[i]}と${CELL_NAMES[i+4]}`, indices: [i, i+4] })});
        } else if (skillKey === 'suihei') {
             [0, 3, 6].forEach(i => { if(isTargetable(i) && isTargetable(i+1) && isTargetable(i+2)) targets.push({ name: `横一列 (${CELL_NAMES[i]}の列)`, indices: [i, i+1, i+2] })});
        } else if (skillKey === 'otaki') {
             [0, 1, 2].forEach(i => { if(isTargetable(i) && isTargetable(i+3) && isTargetable(i+6)) targets.push({ name: `縦一列 (${CELL_NAMES[i]}の列)`, indices: [i, i+3, i+6] })});
        }
        return targets;
    };
    
    // --- 補助UI関数 ---
    const updateRegenerationNotice = () => {
        const turn = state.turn;
        const noticeEl = document.getElementById('regeneration-notice');
        if (turn > 0 && turn % 4 === 0) {
            let maxVal = -1, targetIndex = -1;
            state.gridValues.forEach((val, i) => { if (val >= 5 && val > maxVal) { maxVal = val; targetIndex = i; } });
            if (targetIndex !== -1) noticeEl.textContent = `再生ターン！ ${CELL_NAMES[targetIndex]} が12～16回復します。`;
            else noticeEl.textContent = '再生ターンですが、回復対象のマスがありません。';
            noticeEl.style.display = 'block';
        } else {
            noticeEl.style.display = 'none';
        }
    };
    
    const updateCritTrackerUI = () => {
        document.getElementById('nerai-attempts').textContent = state.neraiAttempts;
        document.getElementById('nerai-successes').textContent = state.neraiSuccesses;
        const rate = state.neraiAttempts > 0 ? (state.neraiSuccesses / state.neraiAttempts) * 100 : 0;
        document.getElementById('nerai-actual-rate').textContent = rate.toFixed(1);
    };

    // --- イベントリスナー設定 ---
    startButton.addEventListener('click', initialize);
    resetButton.addEventListener('click', resetState);
    calculateNextButton.addEventListener('click', () => {
        updateFromUI();
        runCalculationAndDisplay();
        saveState();
    });
    document.getElementById('nerai-attempt-button').addEventListener('click', () => {
        state.neraiAttempts++;
        updateCritTrackerUI();
        saveState();
    });
    document.getElementById('nerai-success-button').addEventListener('click', () => {
        state.neraiSuccesses++;
        updateCritTrackerUI();
        saveState();
    });

    // --- 起動処理 ---
    if (loadState()) {
        startTool();
    }
});
