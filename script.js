window.addEventListener("DOMContentLoaded", async function () {
  const orderInput = document.getElementById("orderInput");
  const searchBtn = document.getElementById("searchBtn");
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const searchScreen = document.getElementById("searchScreen");
  const resultScreen = document.getElementById("resultScreen");
  const resultOrder = document.getElementById("resultOrder");
  const resultProgress = document.getElementById("resultProgress");
  const resultLocation = document.getElementById("resultLocation");
  const resultSku = document.getElementById("resultSku");
  const itemContainer = document.getElementById("itemContainer");

  const orderKey = "PEDIDO";
  const skuKey = "SKU";
  const locationKey = "LOCALIZACAO";

  let headers = [];
  let tableData = [];
  let currentOrderRows = [];
  let currentIndex = 0;
  let loaded = false;
  let locationConfirmed = false;

  async function getSheetUrl() {
    try {
      const response = await fetch("base.json");
      if (!response.ok) throw new Error(`Erro ao carregar JSON: ${response.statusText}`);
      const data = await response.json();
      return data.sheetUrl;
    } catch (error) {
      console.error(`Erro ao obter URL da planilha: ${error.message}`);
      alert("Erro ao carregar a configuração da planilha.");
      return null;
    }
  }

  function parseCsv(csvData) {
    return csvData
      .split(/\r?\n/)
      .filter((row) => row.trim() !== "")
      .map((row) =>
        row
          .split(/,(?=(?:(?:[^"]*"[^"]*")*[^"]*$))/)
          .map((cell) => cell.replace(/^"|"$/g, "").trim())
      );
  }

  async function loadExcelData() {
    try {
      const fileUrl = await getSheetUrl();
      if (!fileUrl) return;
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`Erro ao baixar a planilha: ${response.statusText}`);
      const csvData = await response.text();
      const rows = parseCsv(csvData);
      if (rows.length === 0) throw new Error("O CSV está vazio ou inválido.");

      headers = rows.shift().map((header) => header.toUpperCase().trim());
      tableData = rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
      loaded = true;
    } catch (error) {
      console.error(`Erro ao carregar os dados: ${error.message}`);
      alert("Erro ao carregar os dados da planilha.");
      loaded = false;
    }
  }

  function normalize(value) {
    return String(value || "").trim().toUpperCase();
  }

  function findOrderRows(orderNumber) {
    const normalizedOrder = normalize(orderNumber);
    return tableData.filter((row) => normalize(row[orderKey]) === normalizedOrder);
  }

  function updateResultScreen() {
    const row = currentOrderRows[currentIndex];
    resultOrder.textContent = normalize(row[orderKey]);
    resultProgress.textContent = `${currentIndex + 1}/${currentOrderRows.length}`;
    resultLocation.value = "";
    resultLocation.placeholder = row[locationKey] || "Endereço não informado";
    resultSku.value = "";
    resultSku.placeholder = row[skuKey] || "SKU não informado";
    itemContainer.style.display = "none";
    locationConfirmed = false;
    nextBtn.textContent = "Confirmar Localização";
  }

  function validateLocation() {
    const row = currentOrderRows[currentIndex];
    const enteredLocation = normalize(resultLocation.value);
    const expectedLocation = normalize(row[locationKey]);

    if (!enteredLocation) {
      alert("Preencha a localização para confirmar.");
      return false;
    }

    if (enteredLocation !== expectedLocation) {
      alert("Localização incorreta. Verifique e tente novamente.");
      return false;
    }

    return true;
  }

  function validateItem() {
    const row = currentOrderRows[currentIndex];
    const enteredSku = normalize(resultSku.value);
    const expectedSku = normalize(row[skuKey]);

    if (!enteredSku) {
      alert("Preencha o item para confirmar.");
      return false;
    }

    if (enteredSku !== expectedSku) {
      alert("Item incorreto. Verifique e tente novamente.");
      return false;
    }

    return true;
  }

  function showResultScreen(rows) {
    currentOrderRows = rows;
    currentIndex = 0;
    updateResultScreen();
    searchScreen.style.display = "none";
    resultScreen.style.display = "block";
  }

  function showSearchScreen() {
    resultScreen.style.display = "none";
    searchScreen.style.display = "block";
    orderInput.focus();
  }

  function searchOrder() {
    if (!loaded) {
      alert("Aguarde o carregamento dos dados antes de buscar.");
      return;
    }
    const orderNumber = orderInput.value.trim();
    if (!orderNumber) {
      alert("Digite o número do pedido.");
      return;
    }

    const rows = findOrderRows(orderNumber);
    if (rows.length === 0) {
      alert("Pedido não encontrado.");
      return;
    }

    showResultScreen(rows);
  }

  function nextItem() {
    if (!locationConfirmed) {
      if (!validateLocation()) {
        return;
      }
      locationConfirmed = true;
      itemContainer.style.display = "block";
      nextBtn.textContent = currentIndex + 1 < currentOrderRows.length ? "Confirmar Item" : "Finalizar";
      return;
    }

    if (!validateItem()) {
      return;
    }

    if (currentIndex + 1 < currentOrderRows.length) {
      currentIndex += 1;
      updateResultScreen();
    } else {
      alert("Todos os itens do pedido foram separados.");
      // showSearchScreen();
      window.location.reload();
    }
  }

  searchBtn.addEventListener("click", searchOrder);
  nextBtn.addEventListener("click", nextItem);
  // backBtn.addEventListener("click", showSearchScreen);
  orderInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchOrder();
    }
  });

  await loadExcelData();
});
