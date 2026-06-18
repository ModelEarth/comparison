const tradeData = [
    {
        code: "USA",
        country: "United States",
        imports: 3172,
        exports: 2065
    },
    {
        code: "CHN",
        country: "China",
        imports: 2556,
        exports: 3593
    },
    {
        code: "DEU",
        country: "Germany",
        imports: 1584,
        exports: 1717
    },
    {
        code: "JPN",
        country: "Japan",
        imports: 897,
        exports: 920
    },
    {
        code: "IND",
        country: "India",
        imports: 723,
        exports: 453
    },
    {
        code: "BRA",
        country: "Brazil",
        imports: 278,
        exports: 340
    }
];

const countryASelect = document.querySelector("#country-a");
const countryBSelect = document.querySelector("#country-b");
const comparisonGrid = document.querySelector("#comparison-grid");
const balanceResult = document.querySelector("#balance-result");
const swapButton = document.querySelector("#swap-countries");

function formatMoney(value) {
    const sign = value < 0 ? "-" : "";
    return `${sign}$${Math.abs(value).toLocaleString("en-US")}B`;
}

function getBalance(country) {
    return country.exports - country.imports;
}

function createOptions(selectedCode) {
    return tradeData
        .map((item) => {
            const selected = item.code === selectedCode ? "selected" : "";
            return `<option value="${item.code}" ${selected}>${item.country}</option>`;
        })
        .join("");
}

function getSelectedCountries() {
    const first = tradeData.find((item) => item.code === countryASelect.value);
    const second = tradeData.find((item) => item.code === countryBSelect.value);
    return [first, second];
}

function renderCountryCard(country) {
    const balance = getBalance(country);
    const totalTrade = country.imports + country.exports;
    const maxValue = Math.max(...tradeData.flatMap((item) => [item.imports, item.exports]));
    const exportWidth = `${(country.exports / maxValue) * 100}%`;
    const importWidth = `${(country.imports / maxValue) * 100}%`;
    const balanceClass = balance < 0 ? "balance negative" : "balance";

    return `
        <article class="country-card">
            <div class="country-heading">
                <h2>${country.country}</h2>
                <span class="country-code">${country.code}</span>
            </div>

            <div class="metric-list">
                <div class="metric">
                    <span>Exports</span>
                    <strong>${formatMoney(country.exports)}</strong>
                </div>
                <div class="metric">
                    <span>Imports</span>
                    <strong>${formatMoney(country.imports)}</strong>
                </div>
                <div class="metric">
                    <span>Trade balance</span>
                    <strong class="${balanceClass}">${formatMoney(balance)}</strong>
                </div>
            </div>

            <div class="bar-stack" aria-label="${country.country} trade volume bars">
                <div class="bar-row">
                    <div class="bar-label">
                        <span>Exports</span>
                        <span>${Math.round((country.exports / totalTrade) * 100)}% of total trade</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill exports" style="width: ${exportWidth}"></div>
                    </div>
                </div>
                <div class="bar-row">
                    <div class="bar-label">
                        <span>Imports</span>
                        <span>${Math.round((country.imports / totalTrade) * 100)}% of total trade</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill imports" style="width: ${importWidth}"></div>
                    </div>
                </div>
            </div>
        </article>
    `;
}

function renderBalanceSummary(first, second) {
    const firstBalance = getBalance(first);
    const secondBalance = getBalance(second);
    const difference = firstBalance - secondBalance;

    if (difference === 0) {
        balanceResult.innerHTML = `
            <strong>Even balance</strong>
            <span>Both countries show the same mock balance.</span>
        `;
        return;
    }

    const leader = difference > 0 ? first : second;
    balanceResult.innerHTML = `
        <strong>${leader.country}</strong>
        <span>${formatMoney(Math.abs(difference))} stronger balance</span>
    `;
}

function preventDuplicateSelection(changedSelect) {
    if (countryASelect.value !== countryBSelect.value) return;

    const replacement = tradeData.find((country) => country.code !== changedSelect.value);
    if (changedSelect === countryASelect) {
        countryBSelect.value = replacement.code;
    } else {
        countryASelect.value = replacement.code;
    }
}

function renderComparison() {
    const [first, second] = getSelectedCountries();
    comparisonGrid.innerHTML = [first, second].map(renderCountryCard).join("");
    renderBalanceSummary(first, second);
}

function initialize() {
    countryASelect.innerHTML = createOptions("USA");
    countryBSelect.innerHTML = createOptions("CHN");

    countryASelect.addEventListener("change", () => {
        preventDuplicateSelection(countryASelect);
        renderComparison();
    });

    countryBSelect.addEventListener("change", () => {
        preventDuplicateSelection(countryBSelect);
        renderComparison();
    });

    swapButton.addEventListener("click", () => {
        const previousA = countryASelect.value;
        countryASelect.value = countryBSelect.value;
        countryBSelect.value = previousA;
        renderComparison();
    });

    renderComparison();
}

initialize();
