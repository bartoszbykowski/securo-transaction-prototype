const form = document.getElementById("transactionForm");
const steps = Array.from(document.querySelectorAll(".wizard-step"));
const summaryContent = document.getElementById("summaryContent");
const wizardStatus = document.getElementById("wizardStatus");
const wizardSteps = document.getElementById("wizardSteps");
const formErrors = document.getElementById("formErrors");
const landRegisterSelect = document.getElementById("landRegisterSelect");
const prepaymentValidationMessage = document.getElementById("prepaymentValidationMessage");
const reservationSection = document.getElementById("reservationSection");
const preliminarySection = document.getElementById("preliminarySection");
const finalSection = document.getElementById("finalSection");
const creditStepInfo = document.getElementById("creditStepInfo");
const creditStepForm = document.getElementById("creditStepForm");
const creditBankList = document.getElementById("creditBankList");
const addCreditBankButton = document.getElementById("addCreditBankButton");
const finalInstallmentsDetails = document.getElementById("finalInstallmentsDetails");
const alreadyPaidBlock = document.getElementById("alreadyPaidBlock");

let currentStep = 1;

const kawuData = {
  "WA1M/00012345/7": {
    propertyType: "lokal mieszkalny",
    propertyAddress: "ul. Słoneczna 15/7, 03-100 Warszawa",
    area: "58,40 m2",
    plotNumber: "145/7",
    sharedInterest: "5840/120000"
  },
  "WA2P/00099887/1": {
    propertyType: "dom",
    propertyAddress: "ul. Leśna 4, 05-500 Piaseczno",
    area: "142,00 m2",
    plotNumber: "87/14",
    sharedInterest: "całość działki"
  },
  "KR1K/00111222/9": {
    propertyType: "lokal użytkowy",
    propertyAddress: "ul. Mogilska 20/U4, 31-516 Kraków",
    area: "74,25 m2",
    plotNumber: "221/3",
    sharedInterest: "7425/210000"
  }
};

function applySimpleLayout() {
  document.querySelectorAll("fieldset").forEach((node) => {
    node.style.marginBottom = "18px";
  });
  document.querySelectorAll("label").forEach((node) => {
    node.style.display = "block";
    node.style.marginBottom = "12px";
  });
  document.querySelectorAll("input, select, textarea, button").forEach((node) => {
    node.style.fontFamily = "Arial, Helvetica, sans-serif";
    node.style.fontSize = "15px";
  });
  document.querySelectorAll("table").forEach((node) => {
    node.style.width = "100%";
    node.style.borderCollapse = "collapse";
  });
}

function getRadioValue(name) {
  const checked = form.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function getFieldValue(name) {
  const field = form.elements[name];
  if (!field) return "";
  if (field instanceof RadioNodeList) return field.value || getRadioValue(name);
  if (field.type === "checkbox") return field.checked ? field.value : "";
  return field.value ? field.value.trim() : "";
}

function getCheckboxValues(name) {
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
}

function getListWithOther(name, otherFieldName) {
  const values = getCheckboxValues(name).filter((value) => value !== "inne");
  const otherValue = getFieldValue(otherFieldName);
  if (getCheckboxValues(name).includes("inne") && otherValue) values.push(otherValue);
  return values.join(", ");
}

function parseNumber(value) {
  const clean = String(value || "").replace(/[^0-9]/g, "");
  return clean ? Number(clean) : 0;
}

function formatThousands(value) {
  const clean = String(value || "").replace(/[^0-9]/g, "");
  if (!clean) return "";
  return Number(clean).toLocaleString("en-US");
}

function formatParty(prefix) {
  const type = getFieldValue(`${prefix}Type`);
  if (type === "firma") {
    return [
      getFieldValue(`${prefix}CompanyName`),
      getFieldValue(`${prefix}CompanyRepresentative`)
    ].filter(Boolean).join(" / ");
  }
  return [
    getFieldValue(`${prefix}FirstName`),
    getFieldValue(`${prefix}LastName`)
  ].filter(Boolean).join(" ");
}

function populateKawuFields() {
  const selected = landRegisterSelect.value;
  const data = kawuData[selected];
  ["propertyType", "propertyAddress", "area", "plotNumber", "sharedInterest"].forEach((fieldName) => {
    form.elements[fieldName].value = data ? data[fieldName] : "";
  });
}

function toggleAgreementSections() {
  reservationSection.hidden = !form.querySelector('input[name="reservationEnabled"]').checked;
  preliminarySection.hidden = !form.querySelector('input[name="preliminaryEnabled"]').checked;
  finalSection.hidden = false;
}

function toggleCreditStep() {
  const financing = getFieldValue("financingMethod");
  const needsCredit = financing === "kredyt" || financing === "środki własne + kredyt";
  creditStepInfo.hidden = needsCredit;
  creditStepForm.hidden = !needsCredit;
  if (form.elements.creditAmountReadonly) form.elements.creditAmountReadonly.value = getFieldValue("creditAmount");
  if (form.elements.ownFundsAmountReadonly) form.elements.ownFundsAmountReadonly.value = getFieldValue("ownFundsAmount");
}

function matchesExpectedValue(currentValue, expectedPattern) {
  return expectedPattern.split("|").includes(currentValue);
}

function toggleConditionalBlocks() {
  document.querySelectorAll("[data-show-when]").forEach((block) => {
    const [fieldName, expectedValue] = block.dataset.showWhen.split(":");
    block.hidden = !matchesExpectedValue(getFieldValue(fieldName), expectedValue);
  });
  document.querySelectorAll("[data-show-checkbox]").forEach((block) => {
    const target = block.dataset.showCheckbox;
    const checkbox = form.querySelector(`input[data-toggle-target="${target}"]`);
    block.hidden = !(checkbox && checkbox.checked);
  });
}

function getCreditBankValues() {
  return Array.from(creditBankList.querySelectorAll("[data-credit-bank-row]")).map((row) => {
    const index = row.dataset.creditBankRow;
    return row.querySelector(`[name="creditBank_${index}"]`)?.value || "";
  }).filter(Boolean);
}

function renderCreditBankList(count) {
  const savedValues = getCreditBankValues();
  const listCount = Math.max(1, Math.min(count || savedValues.length || 2, 6));

  creditBankList.innerHTML = Array.from({ length: listCount }, (_, offset) => {
    const index = offset + 1;
    const saved = savedValues[index - 1] || (index === 1 ? "Bank Przykład S.A." : index === 2 ? "Bank Hipoteczny S.A." : "");

    return `
      <fieldset data-credit-bank-row="${index}" style="margin-top: 12px;">
        <legend>Bank ${index}</legend>
        <label>
          <span>Bank do aplikacji</span>
          <select name="creditBank_${index}">
            <option value="">Wybierz bank</option>
            <option value="Bank Przykład S.A." ${saved === "Bank Przykład S.A." ? "selected" : ""}>Bank Przykład S.A.</option>
            <option value="Bank Hipoteczny S.A." ${saved === "Bank Hipoteczny S.A." ? "selected" : ""}>Bank Hipoteczny S.A.</option>
            <option value="Bank Dom S.A." ${saved === "Bank Dom S.A." ? "selected" : ""}>Bank Dom S.A.</option>
            <option value="Bank Mieszkaniowy S.A." ${saved === "Bank Mieszkaniowy S.A." ? "selected" : ""}>Bank Mieszkaniowy S.A.</option>
            <option value="Bank Bezpieczny S.A." ${saved === "Bank Bezpieczny S.A." ? "selected" : ""}>Bank Bezpieczny S.A.</option>
          </select>
          <small class="error-text"></small>
        </label>
      </fieldset>
    `;
  }).join("");
}

function getFinalInstallmentValues() {
  return Array.from(finalInstallmentsDetails.querySelectorAll("[data-installment-row]")).map((row) => {
    const index = row.dataset.installmentRow;
    return {
      index,
      date: row.querySelector(`[name="finalInstallmentDate_${index}"]`)?.value || "",
      condition: row.querySelector(`[name="finalInstallmentCondition_${index}"]`)?.value || "",
      conditionOther: row.querySelector(`[name="finalInstallmentConditionOther_${index}"]`)?.value || "",
      amount: row.querySelector(`[name="finalInstallmentAmount_${index}"]`)?.value || ""
    };
  });
}

function renderFinalInstallments() {
  if (getFieldValue("finalFinanceMode") !== "w transzach") {
    finalInstallmentsDetails.innerHTML = "";
    return;
  }

  const savedValues = getFinalInstallmentValues();
  const count = Math.max(1, Math.min(parseNumber(getFieldValue("finalInstallmentsCount")) || 1, 12));
  const defaultAmount = formatThousands(Math.round(parseNumber(getFieldValue("remainingAmount")) / count));

  finalInstallmentsDetails.innerHTML = Array.from({ length: count }, (_, offset) => {
    const index = offset + 1;
    const saved = savedValues.find((item) => Number(item.index) === index) || {};
    const condition = saved.condition || (index === 1 ? "po decyzji kredytowej" : "w dniu aktu");

    return `
      <fieldset data-installment-row="${index}" style="margin-top: 12px;">
        <legend>Transza ${index}</legend>
        <label>
          <span>Data płatności</span>
          <input type="date" name="finalInstallmentDate_${index}" value="${saved.date || ""}">
          <small class="error-text"></small>
        </label>
        <label>
          <span>Warunek</span>
          <select name="finalInstallmentCondition_${index}">
            <option value="po decyzji kredytowej" ${condition === "po decyzji kredytowej" ? "selected" : ""}>po decyzji kredytowej</option>
            <option value="w dniu aktu" ${condition === "w dniu aktu" ? "selected" : ""}>w dniu aktu</option>
            <option value="po podpisaniu aktu" ${condition === "po podpisaniu aktu" ? "selected" : ""}>po podpisaniu aktu</option>
            <option value="po wydaniu nieruchomości" ${condition === "po wydaniu nieruchomości" ? "selected" : ""}>po wydaniu nieruchomości</option>
            <option value="po wpisie własności kupującego" ${condition === "po wpisie własności kupującego" ? "selected" : ""}>po wpisie własności kupującego</option>
            <option value="inny" ${condition === "inny" ? "selected" : ""}>inny</option>
          </select>
          <small class="error-text"></small>
        </label>
        <div class="conditional" data-show-when="finalInstallmentCondition_${index}:inny" ${condition === "inny" ? "" : "hidden"}>
          <label>
            <span>Własny warunek</span>
            <input type="text" name="finalInstallmentConditionOther_${index}" value="${saved.conditionOther || ""}" placeholder="Dodaj własny warunek">
            <small class="error-text"></small>
          </label>
        </div>
        <label>
          <span>Kwota</span>
          <input type="text" name="finalInstallmentAmount_${index}" value="${saved.amount || defaultAmount}" inputmode="numeric" data-number placeholder="Kwota transzy">
          <small class="error-text"></small>
        </label>
      </fieldset>
    `;
  }).join("");
}

function syncAlreadyPaidBlock() {
  const earnestEnabled =
    !preliminarySection.hidden &&
    ["zadatek", "zaliczka + zadatek"].includes(getFieldValue("preliminaryFinanceType"));

  alreadyPaidBlock.hidden = !earnestEnabled;

  if (!earnestEnabled) {
    if (form.elements.alreadyPaid) form.elements.alreadyPaid.value = "";
    if (form.elements.alreadyPaidType) form.elements.alreadyPaidType.value = "";
  } else if (!getFieldValue("alreadyPaidType") && form.elements.alreadyPaidType) {
    form.elements.alreadyPaidType.value = "zadatek";
  }
}

function updateWizardHeader() {
  wizardStatus.textContent = "Kreator transakcji";
  wizardSteps.innerHTML = "";

  steps.forEach((step) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = step.querySelector("h2").textContent;
    button.dataset.stepTarget = step.dataset.step;
    button.className = "wizard-nav-button";
    button.style.marginRight = "8px";
    button.style.marginBottom = "8px";
    button.style.fontWeight = Number(step.dataset.step) === currentStep ? "bold" : "normal";
    button.classList.toggle("is-active", Number(step.dataset.step) === currentStep);
    wizardSteps.appendChild(button);
  });
}

function showStep(stepNumber) {
  currentStep = Math.min(Math.max(stepNumber, 1), steps.length);
  steps.forEach((step) => {
    step.hidden = Number(step.dataset.step) !== currentStep;
  });
  updateWizardHeader();
  if (currentStep === 5) renderSummary();
}

function clearErrors() {
  form.querySelectorAll(".error-text").forEach((node) => {
    node.textContent = "";
  });
  formErrors.hidden = true;
  formErrors.innerHTML = "";
}

function setFieldError(fieldName, message) {
  const field = form.elements[fieldName];
  if (!field) return;
  const target = field instanceof RadioNodeList ? form.querySelector(`[name="${fieldName}"]`) : field;
  const errorNode = target && target.parentElement ? target.parentElement.querySelector(".error-text") : null;
  if (errorNode) errorNode.textContent = message;
}

function validateRequiredFields(errors) {
  const requiredMessages = {
    sellerType: "Wybierz typ sprzedającego.",
    buyerType: "Wybierz typ kupującego.",
    sellerAddress: "Podaj adres sprzedającego.",
    buyerAddress: "Podaj adres kupującego.",
    landRegister: "Wybierz numer księgi wieczystej.",
    propertyAddress: "Adres nieruchomości powinien być zaczytany z KAWU.",
    totalPrice: "Podaj cenę całkowitą."
  };

  Object.entries(requiredMessages).forEach(([fieldName, message]) => {
    if (!getFieldValue(fieldName)) {
      errors.push(message);
      setFieldError(fieldName, message);
    }
  });

  if (getFieldValue("sellerType") === "osoba fizyczna" && !getFieldValue("sellerFirstName")) {
    errors.push("Podaj imię sprzedającego.");
    setFieldError("sellerFirstName", "Podaj imię sprzedającego.");
  }
  if (getFieldValue("buyerType") === "osoba fizyczna" && !getFieldValue("buyerFirstName")) {
    errors.push("Podaj imię kupującego.");
    setFieldError("buyerFirstName", "Podaj imię kupującego.");
  }
}

function validatePrepaymentSum(errors) {
  if (preliminarySection.hidden) return;
  const total = parseNumber(getFieldValue("prepaymentTotal"));
  let earnest = 0;
  let advance = 0;
  const type = getFieldValue("preliminaryFinanceType");

  if (type === "zaliczka") {
    advance = parseNumber(getFieldValue("preliminaryAdvanceAmount"));
  }
  if (type === "zadatek") {
    earnest = parseNumber(getFieldValue("preliminaryEarnestAmount"));
  }
  if (type === "zaliczka + zadatek") {
    advance = parseNumber(getFieldValue("preliminaryAdvanceMixedAmount"));
    earnest = parseNumber(getFieldValue("preliminaryEarnestMixedAmount"));
  }

  if (total && earnest + advance !== total) {
    const message = "Suma zadatku i zaliczki musi być równa łącznej kwocie przedpłaty.";
    errors.push(message);
    setFieldError("prepaymentTotal", message);
    setFieldError("preliminaryAdvanceAmount", message);
    setFieldError("preliminaryEarnestAmount", message);
    setFieldError("preliminaryAdvanceMixedAmount", message);
    setFieldError("preliminaryEarnestMixedAmount", message);
    prepaymentValidationMessage.textContent = message;
  } else {
    prepaymentValidationMessage.textContent = total ? "Suma zadatku i zaliczki zgadza się." : "";
  }
}

function validateDateRange(errors) {
  const start = getFieldValue("reservationFrom");
  const end = getFieldValue("reservationTo");
  if (start && end && end < start) {
    const message = "Data końca rezerwacji nie może być wcześniejsza niż data początku.";
    errors.push(message);
    setFieldError("reservationFrom", message);
    setFieldError("reservationTo", message);
  }
}

function validateForm() {
  clearErrors();
  const errors = [];
  validateRequiredFields(errors);
  validatePrepaymentSum(errors);
  validateDateRange(errors);

  if (errors.length > 0) {
    formErrors.hidden = false;
    formErrors.innerHTML = `<strong>Do poprawy:</strong><ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>`;
  }
  return errors;
}

function summarySection(title, rows) {
  const filtered = rows.filter(([, value]) => value !== "" && value !== null && value !== undefined);
  return `
    <section style="margin-bottom: 18px;">
      <h3>${title}</h3>
      <table border="1" cellpadding="6" cellspacing="0">
        <tbody>
          ${filtered.map(([label, value]) => `<tr><td><strong>${label}</strong></td><td>${value || "brak danych"}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderSummary() {
  const errors = validateForm();
  const missing = [];
  const installmentSummary = getFinalInstallmentValues()
    .map((item) => {
      const condition = item.condition === "inny" ? item.conditionOther : item.condition;
      return `Transza ${item.index}: ${item.amount || "brak kwoty"} / ${item.date || "brak daty"} / ${condition || "brak warunku"}`;
    })
    .join("<br>");

  if (!getFieldValue("sellerEmail")) missing.push("brak e-maila sprzedającego");
  if (!getFieldValue("buyerEmail")) missing.push("brak e-maila kupującego");
  if ((getFieldValue("financingMethod") === "kredyt" || getFieldValue("financingMethod") === "środki własne + kredyt") && getCreditBankValues().length === 0) {
    missing.push("nie wybrano banków do wysyłki aplikacji");
  }

  summaryContent.innerHTML = `
    ${errors.length ? summarySection("Błędy do poprawy", errors.map((error, index) => [`Błąd ${index + 1}`, error])) : ""}
    ${missing.length ? summarySection("Na co jeszcze warto zwrócić uwagę", missing.map((item, index) => [`Uwaga ${index + 1}`, item])) : ""}
    ${summarySection("Kto bierze udział", [
      ["Sprzedający", formatParty("seller")],
      ["Kupujący", formatParty("buyer")],
      ["Notariusz", getFieldValue("notaryMode") === "dropdown" ? getFieldValue("stakeholderNotaryContact") : getFieldValue("notaryMode") === "email" ? getFieldValue("notaryInviteEmail") : getFieldValue("notaryInviteLink")],
      ["Pośrednik sprzedającego", getFieldValue("sellerBrokerInvolved") === "nie" ? "nie dotyczy" : getFieldValue("sellerBrokerMode") === "email" ? getFieldValue("sellerBrokerInviteEmail") : getFieldValue("sellerBrokerInviteLink")],
      ["Pośrednik kupującego", getFieldValue("buyerBrokerInvolved") === "nie" ? "nie dotyczy" : getFieldValue("buyerBrokerMode") === "email" ? getFieldValue("buyerBrokerInviteEmail") : getFieldValue("buyerBrokerInviteLink")]
    ])}
    ${summarySection("Co jest sprzedawane", [
      ["Numer księgi wieczystej", getFieldValue("landRegister")],
      ["Typ nieruchomości", getFieldValue("propertyType")],
      ["Adres", getFieldValue("propertyAddress")],
      ["Powierzchnia", getFieldValue("area")],
      ["Numer działki", getFieldValue("plotNumber")],
      ["Pomieszczenia przynależne", getListWithOther("annexRoomsList", "annexRoomsOtherText")],
      ["Miejsce postojowe", getFieldValue("parkingSpaceChoice") === "inne" ? getFieldValue("parkingSpaceOtherText") : getFieldValue("parkingSpaceChoice")],
      ["Komórka lokatorska", getFieldValue("storageUnitChoice") === "inne" ? getFieldValue("storageUnitOtherText") : getFieldValue("storageUnitChoice")],
      ["Wyposażenie objęte sprzedażą", getListWithOther("includedEquipmentList", "includedEquipmentOtherText")],
      ["Obciążenia", getFieldValue("hasEncumbrance") === "tak" ? getListWithOther("encumbranceList", "encumbranceOtherText") : "nie"]
    ])}
    ${summarySection("Jak jest rozłożona płatność", [
      ["Cena całkowita", `${getFieldValue("totalPrice")} ${getFieldValue("currency")}`],
      ["Sposób finansowania", getFieldValue("financingMethod")],
      ["Rezerwacja", `${getFieldValue("reservationFinanceType")} / ${getFieldValue("reservationFinanceAmount")}`],
      ["Przedwstępna", getFieldValue("preliminaryFinanceType")],
      ["Finalna", getFieldValue("finalFinanceMode") === "w transzach" ? installmentSummary : getFieldValue("finalFinanceMode")],
      ["Pozostała kwota do zapłaty", getFieldValue("remainingAmount")]
    ])}
    ${summarySection("Jakie warunki trzeba spełnić", [
      ["Umowa rezerwacyjna", form.querySelector('input[name="reservationEnabled"]').checked ? "tak" : "nie"],
      ["Umowa przedwstępna", form.querySelector('input[name="preliminaryEnabled"]').checked ? "tak" : "nie"],
      ["Umowa przyrzeczona", "tak"],
      ["Okres rezerwacji", `${getFieldValue("reservationFrom")} - ${getFieldValue("reservationTo")}`],
      ["Inne warunki przedwstępnej", getListWithOther("otherConditionsList", "otherConditionsOtherText")],
      ["Koszty notariusza", getFieldValue("notaryCostsPreliminary") === "inaczej" ? getFieldValue("notaryCostsPreliminaryOther") : getFieldValue("notaryCostsPreliminary")],
      ["Wpis roszczenia do KAWU / KW", getFieldValue("claimEntryEnabled") === "tak" ? `${getFieldValue("claimEntryType") === "inne" ? getFieldValue("claimEntryTypeOther") : getFieldValue("claimEntryType")} / wniosek składa: ${getFieldValue("claimEntryApplicant")}` : "nie"]
    ])}
    ${summarySection("Umowa przyrzeczona", [
      ["Sposób zapłaty pozostałej kwoty", getFieldValue("remainingPaymentMethod")],
      ["Mechanizm depozytu", getFieldValue("remainingPaymentMethod") === "depozyt notarialny" || getFieldValue("remainingPaymentMethod") === "escrow / rachunek techniczny" ? getFieldValue("depositMechanism") : "nie dotyczy"],
      ["Warunek uruchomienia wypłaty", getFieldValue("remainingPaymentMethod") === "depozyt notarialny" || getFieldValue("remainingPaymentMethod") === "escrow / rachunek techniczny" ? getListWithOther("depositReleaseConditionList", "depositReleaseConditionOther") : "nie dotyczy"]
    ])}
    ${summarySection("Kredytowanie", [
      ["Czy krok kredytowy jest aktywny", creditStepForm.hidden ? "nie" : "tak"],
      ["Kwota kredytu", getFieldValue("creditAmount")],
      ["Kwota środków własnych", getFieldValue("ownFundsAmount")],
      ["Banki do wysyłki aplikacji", getCreditBankValues().join(", ") || "brak"]
    ])}
  `;
}

function formatNumericInputs() {
  form.querySelectorAll("input[data-number]").forEach((input) => {
    input.value = formatThousands(input.value);
  });
}

function updatePercentOutputs() {
  const total = parseNumber(getFieldValue("totalPrice"));
  const setPercent = (fieldName, outputId) => {
    const output = document.getElementById(outputId);
    if (!output) return;
    const value = parseNumber(getFieldValue(fieldName));
    output.textContent = total && value ? `${((value / total) * 100).toFixed(1)}%` : "0%";
  };

  setPercent("reservationFinanceAmount", "reservationFinancePercent");
  setPercent("preliminaryAdvanceAmount", "preliminaryAdvancePercent");
  setPercent("preliminaryEarnestAmount", "preliminaryEarnestPercent");
  setPercent("preliminaryAdvanceMixedAmount", "preliminaryAdvanceMixedPercent");
  setPercent("preliminaryEarnestMixedAmount", "preliminaryEarnestMixedPercent");
  setPercent("creditAmount", "creditAmountPercent");
  setPercent("ownFundsAmount", "ownFundsPercent");
}

function handleNumericInput(event) {
  if (event.target.matches("input[data-number]")) {
    event.target.value = formatThousands(event.target.value);
  }
}

function updateAllDynamicParts() {
  populateKawuFields();
  toggleAgreementSections();
  toggleCreditStep();
  renderCreditBankList();
  renderFinalInstallments();
  syncAlreadyPaidBlock();
  toggleConditionalBlocks();
  applySimpleLayout();
  formatNumericInputs();
  updatePercentOutputs();
}

form.addEventListener("change", () => {
  updateAllDynamicParts();
  validatePrepaymentSum([]);
});

form.addEventListener("input", (event) => {
  handleNumericInput(event);
  validatePrepaymentSum([]);
});

addCreditBankButton.addEventListener("click", () => {
  renderCreditBankList(getCreditBankValues().length + 1);
  applySimpleLayout();
});

wizardSteps.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-step-target]");
  if (!target) return;
  showStep(Number(target.dataset.stepTarget));
});

landRegisterSelect.addEventListener("change", populateKawuFields);

applySimpleLayout();
updateAllDynamicParts();
showStep(1);
