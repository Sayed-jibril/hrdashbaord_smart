let allEmployees = [];
let filteredEmployees = [];
let tableFilteredEmployees = [];
let charts = {};
let currentPage = 1;
let rowsPerPage = 25;
let totalPages = 1;
let currentSort = { column: null, direction: "asc" };
let workbookData = null; // Store workbook data for sheet selection
let allSheetsData = {}; // Store data from all sheets for switching

// Load Excel file
function loadFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select an Excel file");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // Check if workbook has multiple sheets
      if (workbook.SheetNames.length > 1) {
        workbookData = workbook;
        showSheetSelectionModal(workbook.SheetNames);
      } else {
        // Single sheet - process directly
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        processData(jsonData, workbook.SheetNames[0]);
      }
    } catch (error) {
      alert("Error processing file: " + error.message);
    }
  };

  reader.readAsArrayBuffer(file);
}

// Show sheet selection modal
function showSheetSelectionModal(sheetNames) {
  const modal = document.getElementById("sheetModal");
  const singleSheetList = document.getElementById("singleSheetList");
  const multipleSheetList = document.getElementById("multipleSheetList");

  // Clear existing options
  singleSheetList.innerHTML = "";
  multipleSheetList.innerHTML = "";

  // Add sheet options for single selection
  sheetNames.forEach((sheetName, index) => {
    const sheetOption = document.createElement("div");
    sheetOption.className = "sheet-option";
    sheetOption.innerHTML = `
      <input type="radio" id="singleSheet${index}" name="selectedSheet" value="${sheetName}">
      <label for="singleSheet${index}">${sheetName}</label>
    `;
    singleSheetList.appendChild(sheetOption);

    // Select the first sheet by default
    if (index === 0) {
      document.getElementById(`singleSheet${index}`).checked = true;
    }
  });

  // Add sheet options for multiple selection
  sheetNames.forEach((sheetName, index) => {
    const sheetOption = document.createElement("div");
    sheetOption.className = "sheet-option";
    sheetOption.innerHTML = `
      <input type="checkbox" id="multiSheet${index}" name="selectedSheets" value="${sheetName}">
      <label for="multiSheet${index}">${sheetName}</label>
    `;
    multipleSheetList.appendChild(sheetOption);
  });

  // Show modal
  modal.style.display = "block";

  // Set up event listeners
  document.querySelector(".close").onclick = function () {
    modal.style.display = "none";
  };

  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  // Set up processing option change listener
  document
    .querySelectorAll('input[name="processingOption"]')
    .forEach((radio) => {
      radio.addEventListener("change", function () {
        // Show/hide sheet selection based on option
        const singleSheetSelection = document.getElementById(
          "singleSheetSelection"
        );
        const multipleSheetSelection = document.getElementById(
          "multipleSheetSelection"
        );

        // Hide all selections first
        singleSheetSelection.style.display = "none";
        multipleSheetSelection.style.display = "none";

        // Show the appropriate selection
        if (this.value === "single") {
          singleSheetSelection.style.display = "block";
        } else if (this.value === "multiple") {
          multipleSheetSelection.style.display = "block";
        }
      });
    });

  // Set up process button
  document.getElementById("processSheetsBtn").onclick = processSelectedOption;
}

// Process the selected option
function processSelectedOption() {
  const selectedOption = document.querySelector(
    'input[name="processingOption"]:checked'
  ).value;

  switch (selectedOption) {
    case "single":
      const selectedSheet = document.querySelector(
        'input[name="selectedSheet"]:checked'
      );
      if (!selectedSheet) {
        alert("Please select a sheet");
        return;
      }
      const sheetName = selectedSheet.value;
      const sheet = workbookData.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      // Hide modal
      document.getElementById("sheetModal").style.display = "none";

      // Process the data
      processData(jsonData, sheetName);
      break;

    case "multiple":
      const selectedSheets = document.querySelectorAll(
        'input[name="selectedSheets"]:checked'
      );
      if (selectedSheets.length === 0) {
        alert("Please select at least one sheet");
        return;
      }

      // Load all selected sheets
      allSheetsData = {};
      selectedSheets.forEach((checkbox) => {
        const sheetName = checkbox.value;
        const sheet = workbookData.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet);

        // Add sheet name as a property to each employee
        allSheetsData[sheetName] = sheetData.map((employee) => ({
          ...employee,
          Sheet: sheetName,
        }));
      });

      // Populate sheet selector dropdown
      populateSheetSelector(Object.keys(allSheetsData));

      // Process the first sheet by default
      const firstSheetName = Object.keys(allSheetsData)[0];
      processData(allSheetsData[firstSheetName], firstSheetName);

      // Hide modal
      document.getElementById("sheetModal").style.display = "none";
      break;

    case "combine":
      // Combine all sheets
      let combinedData = [];
      workbookData.SheetNames.forEach((sheetName) => {
        const sheet = workbookData.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet);

        // Add sheet name as a property to each employee
        const sheetEmployees = sheetData.map((employee) => ({
          ...employee,
          Sheet: sheetName,
        }));

        combinedData = [...combinedData, ...sheetEmployees];
      });

      // Hide modal
      document.getElementById("sheetModal").style.display = "none";

      // Process the combined data
      processData(combinedData, "Combined Sheets");
      break;
  }
}

// Populate sheet selector dropdown
function populateSheetSelector(sheetNames) {
  const sheetSelector = document.getElementById("sheetSelector");
  const sheetSelect = document.getElementById("sheetSelect");

  // Clear existing options
  sheetSelect.innerHTML = '<option value="">Select a sheet</option>';

  // Add sheet options
  sheetNames.forEach((sheetName) => {
    const option = document.createElement("option");
    option.value = sheetName;
    option.textContent = sheetName;
    sheetSelect.appendChild(option);
  });

  // Show sheet selector
  sheetSelector.style.display = "flex";

  // Set up change listener
  sheetSelect.onchange = function () {
    const selectedSheet = this.value;
    if (selectedSheet && allSheetsData[selectedSheet]) {
      processData(allSheetsData[selectedSheet], selectedSheet);
    }
  };
}

// Modified processData function
function processData(data, sheetName = "Unknown") {
  allEmployees = data.map((employee) => ({
    ...employee,
    // Ensure numeric fields are numbers
    Age: Number(employee.Age) || 0,
    "Annual Salary": Number(employee["Annual Salary"]) || 0,
    "Bonus %": Number(employee["Bonus %"]) || 0,
    "Job Grade": Number(employee["Job Grade"]) || 0,
    "Medical Usage": Number(employee["Medical Usage"]) || 0,
    // Calculate tenure from hire date and status
    Tenure: calculateTenure(employee["Hire Date"], employee["Exit Date"]),
    Status: employee["Exit Date"] ? "Exited" : "Active",
    "Bonus Amount":
      (Number(employee["Annual Salary"]) || 0) *
      (Number(employee["Bonus %"]) || 0),
    // Add sheet name if not already present
    Sheet: employee.Sheet || sheetName,
  }));

  filteredEmployees = [...allEmployees];
  tableFilteredEmployees = [...allEmployees];

  // Update filters
  updateFilters();

  // Initialize sliders
  initializeSliders();

  // Calculate and display KPIs
  updateKPIs();

  // Create charts
  createCharts();

  // Update table with pagination
  updatePagination();
  updateEmployeeTable();

  // Update sheet selector if visible
  const sheetSelect = document.getElementById("sheetSelect");
  if (sheetSelect && sheetName !== "Combined Sheets") {
    sheetSelect.value = sheetName;
  }
}

function calculateTenure(hireDate, exitDate) {
  if (!hireDate) return 0;

  const hire = new Date(hireDate);
  const endDate = exitDate ? new Date(exitDate) : new Date();
  const diffTime = Math.abs(endDate - hire);
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

  return Math.round(diffYears * 10) / 10; // Round to 1 decimal place
}

function updateFilters() {
  const departments = [
    ...new Set(allEmployees.map((e) => e.Department)),
  ].sort();
  const jobTitles = [
    ...new Set(allEmployees.map((e) => e["Job Title"])),
  ].sort();
  const jobGrades = [...new Set(allEmployees.map((e) => e["Job Grade"]))].sort(
    (a, b) => a - b
  );
  const genders = [...new Set(allEmployees.map((e) => e.Gender))].sort();
  const countries = [...new Set(allEmployees.map((e) => e.Country))].sort();
  const cities = [...new Set(allEmployees.map((e) => e.City))].sort();
  const businessUnits = [
    ...new Set(allEmployees.map((e) => e["Business Unit"])),
  ].sort();
  const ethnicities = [...new Set(allEmployees.map((e) => e.Ethnicity))].sort();

  updateFilterOptions("departmentFilter", departments);
  updateFilterOptions("jobTitleFilter", jobTitles);
  updateFilterOptions("jobGradeFilter", jobGrades);
  updateFilterOptions("genderFilter", genders);
  updateFilterOptions("countryFilter", countries);
  updateFilterOptions("cityFilter", cities);
  updateFilterOptions("businessUnitFilter", businessUnits);
  updateFilterOptions("ethnicityFilter", ethnicities);

  // Update table filters
  updateFilterOptions("tableDepartmentFilter", departments);
  updateFilterOptions("tableCountryFilter", countries);
  updateFilterOptions("tableCityFilter", cities);
  updateFilterOptions("tableGenderFilter", genders);
  updateFilterOptions("tableJobTitleFilter", jobTitles);
}

function updateFilterOptions(selectId, options) {
  const select = document.getElementById(selectId);
  // Keep the first option (All)
  const firstOption = select.options[0];
  select.innerHTML = "";
  select.appendChild(firstOption);

  options.forEach((option) => {
    if (option) {
      // Skip empty values
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      select.appendChild(optionElement);
    }
  });
}

function initializeSliders() {
  // Get min and max values from data
  const salaries = allEmployees
    .map((e) => e["Annual Salary"])
    .filter((s) => s > 0);
  const minSalary = Math.min(...salaries);
  const maxSalary = Math.max(...salaries);

  const ages = allEmployees.map((e) => e.Age).filter((a) => a > 0);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);

  // Initialize salary sliders
  const minSalarySlider = document.getElementById("minSalarySlider");
  const maxSalarySlider = document.getElementById("maxSalarySlider");
  const salaryMinValue = document.getElementById("salaryMinValue");
  const salaryMaxValue = document.getElementById("salaryMaxValue");
  const salaryProgress = document.querySelector(
    ".salary-range .range-progress"
  );

  minSalarySlider.min = minSalary;
  minSalarySlider.max = maxSalary;
  minSalarySlider.value = minSalary;

  maxSalarySlider.min = minSalary;
  maxSalarySlider.max = maxSalary;
  maxSalarySlider.value = maxSalary;

  salaryMinValue.textContent = "RM" + minSalary.toLocaleString();
  salaryMaxValue.textContent = "RM" + maxSalary.toLocaleString();

  updateSliderProgress(minSalarySlider, maxSalarySlider, salaryProgress);

  // Initialize age sliders
  const minAgeSlider = document.getElementById("minAgeSlider");
  const maxAgeSlider = document.getElementById("maxAgeSlider");
  const ageMinValue = document.getElementById("ageMinValue");
  const ageMaxValue = document.getElementById("ageMaxValue");
  const ageProgress = document.querySelector(".age-range .range-progress");

  minAgeSlider.min = minAge;
  minAgeSlider.max = maxAge;
  minAgeSlider.value = minAge;

  maxAgeSlider.min = minAge;
  maxAgeSlider.max = maxAge;
  maxAgeSlider.value = maxAge;

  ageMinValue.textContent = minAge;
  ageMaxValue.textContent = maxAge;

  updateSliderProgress(minAgeSlider, maxAgeSlider, ageProgress);

  // Add event listeners for sliders
  minSalarySlider.addEventListener("input", function () {
    if (parseInt(this.value) > parseInt(maxSalarySlider.value)) {
      this.value = maxSalarySlider.value;
    }
    salaryMinValue.textContent = "RM" + parseInt(this.value).toLocaleString();
    updateSliderProgress(minSalarySlider, maxSalarySlider, salaryProgress);
  });

  maxSalarySlider.addEventListener("input", function () {
    if (parseInt(this.value) < parseInt(minSalarySlider.value)) {
      this.value = minSalarySlider.value;
    }
    salaryMaxValue.textContent = "RM" + parseInt(this.value).toLocaleString();
    updateSliderProgress(minSalarySlider, maxSalarySlider, salaryProgress);
  });

  minAgeSlider.addEventListener("input", function () {
    if (parseInt(this.value) > parseInt(maxAgeSlider.value)) {
      this.value = maxAgeSlider.value;
    }
    ageMinValue.textContent = this.value;
    updateSliderProgress(minAgeSlider, maxAgeSlider, ageProgress);
  });

  maxAgeSlider.addEventListener("input", function () {
    if (parseInt(this.value) < parseInt(minAgeSlider.value)) {
      this.value = minAgeSlider.value;
    }
    ageMaxValue.textContent = this.value;
    updateSliderProgress(minAgeSlider, maxAgeSlider, ageProgress);
  });
}

function updateSliderProgress(minSlider, maxSlider, progressElement) {
  if (!progressElement) return;

  const min = parseInt(minSlider.min);
  const max = parseInt(minSlider.max);
  const minVal = parseInt(minSlider.value);
  const maxVal = parseInt(maxSlider.value);

  const minPercent = ((minVal - min) / (max - min)) * 100;
  const maxPercent = ((maxVal - min) / (max - min)) * 100;

  progressElement.style.left = minPercent + "%";
  progressElement.style.width = maxPercent - minPercent + "%";
}

function toggleFilters() {
  const filtersContainer = document.getElementById("filtersContainer");
  const toggleBtn = document.getElementById("toggleFiltersBtn");

  if (filtersContainer.style.display === "none") {
    filtersContainer.style.display = "block";
    toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Hide Filters';
  } else {
    filtersContainer.style.display = "none";
    toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Show Filters';
  }
}

function toggleTableFilters() {
  const tableFiltersContainer = document.getElementById(
    "tableFiltersContainer"
  );
  const toggleBtn = document.getElementById("toggleTableFiltersBtn");

  if (tableFiltersContainer.style.display === "none") {
    tableFiltersContainer.style.display = "block";
    toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Hide Filters';
  } else {
    tableFiltersContainer.style.display = "none";
    toggleBtn.innerHTML = '<i class="fas fa-filter"></i> Show Filters';
  }
}

function filterData() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const department = document.getElementById("departmentFilter").value;
  const jobTitle = document.getElementById("jobTitleFilter").value;
  const jobGrade = document.getElementById("jobGradeFilter").value;
  const gender = document.getElementById("genderFilter").value;
  const country = document.getElementById("countryFilter").value;
  const city = document.getElementById("cityFilter").value;
  const businessUnit = document.getElementById("businessUnitFilter").value;
  const ethnicity = document.getElementById("ethnicityFilter").value;
  const bonusFilter = document.getElementById("bonusFilter").value;
  const exitStatus = document.getElementById("exitStatusFilter").value;

  // Get slider values
  const minSalary = parseInt(document.getElementById("minSalarySlider").value);
  const maxSalary = parseInt(document.getElementById("maxSalarySlider").value);
  const minAge = parseInt(document.getElementById("minAgeSlider").value);
  const maxAge = parseInt(document.getElementById("maxAgeSlider").value);

  filteredEmployees = allEmployees.filter((employee) => {
    // Search term filter
    const matchesSearch =
      !searchTerm ||
      Object.values(employee).some((value) =>
        String(value).toLowerCase().includes(searchTerm)
      );

    // Basic filters
    const matchesDept = !department || employee.Department === department;
    const matchesJobTitle = !jobTitle || employee["Job Title"] === jobTitle;
    const matchesGrade = !jobGrade || employee["Job Grade"] == jobGrade;
    const matchesGender = !gender || employee.Gender === gender;
    const matchesCountry = !country || employee.Country === country;
    const matchesCity = !city || employee.City === city;
    const matchesBusinessUnit =
      !businessUnit || employee["Business Unit"] === businessUnit;
    const matchesEthnicity = !ethnicity || employee.Ethnicity === ethnicity;

    // Bonus filter
    const matchesBonus =
      !bonusFilter ||
      (bonusFilter === "with-bonus" && employee["Bonus %"] > 0) ||
      (bonusFilter === "no-bonus" && employee["Bonus %"] === 0);

    // Exit status filter
    const matchesExitStatus =
      !exitStatus ||
      (exitStatus === "active" && !employee["Exit Date"]) ||
      (exitStatus === "exited" && employee["Exit Date"]);

    // Salary range filter
    const matchesSalary =
      employee["Annual Salary"] >= minSalary &&
      employee["Annual Salary"] <= maxSalary;

    // Age range filter
    const matchesAge = employee.Age >= minAge && employee.Age <= maxAge;

    return (
      matchesSearch &&
      matchesDept &&
      matchesJobTitle &&
      matchesGrade &&
      matchesGender &&
      matchesCountry &&
      matchesCity &&
      matchesBusinessUnit &&
      matchesEthnicity &&
      matchesBonus &&
      matchesExitStatus &&
      matchesSalary &&
      matchesAge
    );
  });

  tableFilteredEmployees = [...filteredEmployees];
  currentPage = 1;

  updateKPIs();
  updateCharts();
  updatePagination();
  updateEmployeeTable();
}

function filterTable() {
  const searchTerm = document.getElementById("tableSearch").value.toLowerCase();
  const department = document.getElementById("tableDepartmentFilter").value;
  const country = document.getElementById("tableCountryFilter").value;
  const city = document.getElementById("tableCityFilter").value;
  const gender = document.getElementById("tableGenderFilter").value;
  const jobTitle = document.getElementById("tableJobTitleFilter").value;
  const bonusFilter = document.getElementById("tableBonusFilter").value;

  tableFilteredEmployees = filteredEmployees.filter((employee) => {
    const matchesSearch =
      !searchTerm ||
      Object.values(employee).some((value) =>
        String(value).toLowerCase().includes(searchTerm)
      );

    const matchesDept = !department || employee.Department === department;
    const matchesCountry = !country || employee.Country === country;
    const matchesCity = !city || employee.City === city;
    const matchesGender = !gender || employee.Gender === gender;
    const matchesJobTitle = !jobTitle || employee["Job Title"] === jobTitle;
    const matchesBonus =
      !bonusFilter || (bonusFilter === "bonus" && employee["Bonus %"] > 0);

    return (
      matchesSearch &&
      matchesDept &&
      matchesCountry &&
      matchesCity &&
      matchesGender &&
      matchesJobTitle &&
      matchesBonus
    );
  });

  currentPage = 1;
  updatePagination();
  updateEmployeeTable();
}

function resetFilters() {
  // Reset main filters
  document.getElementById("searchInput").value = "";
  document.getElementById("departmentFilter").value = "";
  document.getElementById("jobTitleFilter").value = "";
  document.getElementById("jobGradeFilter").value = "";
  document.getElementById("genderFilter").value = "";
  document.getElementById("countryFilter").value = "";
  document.getElementById("cityFilter").value = "";
  document.getElementById("businessUnitFilter").value = "";
  document.getElementById("ethnicityFilter").value = "";
  document.getElementById("bonusFilter").value = "";
  document.getElementById("exitStatusFilter").value = "";

  // Reset sliders
  initializeSliders();

  filteredEmployees = [...allEmployees];
  tableFilteredEmployees = [...allEmployees];
  currentPage = 1;

  updateKPIs();
  updateCharts();
  updatePagination();
  updateEmployeeTable();
}

function resetTableFilters() {
  // Reset table filters
  document.getElementById("tableSearch").value = "";
  document.getElementById("tableDepartmentFilter").value = "";
  document.getElementById("tableCountryFilter").value = "";
  document.getElementById("tableCityFilter").value = "";
  document.getElementById("tableGenderFilter").value = "";
  document.getElementById("tableJobTitleFilter").value = "";
  document.getElementById("tableBonusFilter").value = "";

  tableFilteredEmployees = [...filteredEmployees];
  currentPage = 1;
  updatePagination();
  updateEmployeeTable();
}

function updateKPIs() {
  const totalEmployees = filteredEmployees.length;
  const activeEmployees = filteredEmployees.filter(
    (e) => !e["Exit Date"]
  ).length;
  const exitedEmployees = filteredEmployees.filter(
    (e) => e["Exit Date"]
  ).length;
  const exitRate =
    totalEmployees > 0 ? (exitedEmployees / totalEmployees) * 100 : 0;

  const salaries = filteredEmployees
    .map((e) => e["Annual Salary"])
    .filter((s) => s > 0);
  const avgSalary =
    salaries.length > 0
      ? salaries.reduce((sum, s) => sum + s, 0) / salaries.length
      : 0;
  const minSalary = salaries.length > 0 ? Math.min(...salaries) : 0;
  const maxSalary = salaries.length > 0 ? Math.max(...salaries) : 0;

  const ages = filteredEmployees.map((e) => e.Age).filter((a) => a > 0);
  const avgAge =
    ages.length > 0 ? ages.reduce((sum, a) => sum + a, 0) / ages.length : 0;
  const minAge = ages.length > 0 ? Math.min(...ages) : 0;
  const maxAge = ages.length > 0 ? Math.max(...ages) : 0;

  const tenures = filteredEmployees.map((e) => e.Tenure).filter((t) => t > 0);
  const avgTenure =
    tenures.length > 0
      ? tenures.reduce((sum, t) => sum + t, 0) / tenures.length
      : 0;
  const minTenure = tenures.length > 0 ? Math.min(...tenures) : 0;
  const maxTenure = tenures.length > 0 ? Math.max(...tenures) : 0;

  const totalBonus = filteredEmployees.reduce(
    (sum, e) => sum + (e["Bonus Amount"] || 0),
    0
  );
  const bonusEmployees = filteredEmployees.filter(
    (e) => e["Bonus %"] > 0
  ).length;

  const medicalUsages = filteredEmployees
    .map((e) => e["Medical Usage"])
    .filter((m) => m > 0);
  const avgMedical =
    medicalUsages.length > 0
      ? medicalUsages.reduce((sum, m) => sum + m, 0) / medicalUsages.length
      : 0;
  const minMedical = medicalUsages.length > 0 ? Math.min(...medicalUsages) : 0;
  const maxMedical = medicalUsages.length > 0 ? Math.max(...medicalUsages) : 0;

  // Update KPI cards
  document.getElementById("totalEmployees").textContent =
    totalEmployees.toLocaleString();
  document.getElementById(
    "activeEmployees"
  ).textContent = `${activeEmployees.toLocaleString()} Active`;
  document.getElementById("avgSalary").textContent =
    "RM" + Math.round(avgSalary).toLocaleString();
  document.getElementById("salaryRange").textContent = `RM${Math.round(
    minSalary
  ).toLocaleString()} - RM${Math.round(maxSalary).toLocaleString()}`;
  document.getElementById("avgAge").textContent = Math.round(avgAge);
  document.getElementById("ageRange").textContent = `${minAge} - ${maxAge} yrs`;
  document.getElementById("avgTenure").textContent =
    avgTenure.toFixed(1) + " yrs";
  document.getElementById("tenureRange").textContent = `${minTenure.toFixed(
    1
  )} - ${maxTenure.toFixed(1)} yrs`;
  document.getElementById("totalBonus").textContent =
    "RM" + Math.round(totalBonus).toLocaleString();
  document.getElementById(
    "bonusEmployees"
  ).textContent = `${bonusEmployees.toLocaleString()} Employees`;
  document.getElementById("avgMedical").textContent =
    "RM" + Math.round(avgMedical).toLocaleString();
  document.getElementById("medicalRange").textContent = `RM${Math.round(
    minMedical
  ).toLocaleString()} - RM${Math.round(maxMedical).toLocaleString()}`;
  document.getElementById("exitRate").textContent = exitRate.toFixed(1) + "%";
  document.getElementById(
    "exitedCount"
  ).textContent = `${exitedEmployees.toLocaleString()} Exited`;
}

function createCharts() {
  // Destroy existing charts
  Object.values(charts).forEach((chart) => {
    if (chart) chart.destroy();
  });

  charts = {};

  // Gender Distribution by Department
  const genderDeptCtx = document
    .getElementById("genderDeptChart")
    .getContext("2d");
  charts.genderDept = createGenderDeptChart(genderDeptCtx);

  // Salary by Job Grade
  const salaryGradeCtx = document
    .getElementById("salaryGradeChart")
    .getContext("2d");
  charts.salaryGrade = createSalaryGradeChart(salaryGradeCtx);

  // Location Chart
  const locationCtx = document.getElementById("locationChart").getContext("2d");
  charts.location = createLocationChart(locationCtx);

  // Business Unit Distribution
  const businessUnitCtx = document
    .getElementById("businessUnitChart")
    .getContext("2d");
  charts.businessUnit = createBusinessUnitChart(businessUnitCtx);

  // Bonus Distribution
  const bonusCtx = document.getElementById("bonusChart").getContext("2d");
  charts.bonus = createBonusChart(bonusCtx);

  // Medical Usage by Age
  const medicalAgeCtx = document
    .getElementById("medicalAgeChart")
    .getContext("2d");
  charts.medicalAge = createMedicalAgeChart(medicalAgeCtx);
}

function updateCharts() {
  // Update existing charts with new data
  if (charts.genderDept) {
    const departments = [
      ...new Set(filteredEmployees.map((e) => e.Department)),
    ];
    const genders = [...new Set(filteredEmployees.map((e) => e.Gender))];

    const datasets = genders.map((gender) => {
      const data = departments.map(
        (dept) =>
          filteredEmployees.filter(
            (e) => e.Department === dept && e.Gender === gender
          ).length
      );

      return {
        label: gender,
        data: data,
        backgroundColor: getColorForGender(gender),
      };
    });

    charts.genderDept.data.labels = departments;
    charts.genderDept.data.datasets = datasets;
    charts.genderDept.update();
  }

  if (charts.salaryGrade) {
    const grades = [
      ...new Set(filteredEmployees.map((e) => e["Job Grade"])),
    ].sort((a, b) => a - b);

    const avgSalaries = grades.map((grade) => {
      const gradeEmployees = filteredEmployees.filter(
        (e) => e["Job Grade"] === grade
      );
      return gradeEmployees.length > 0
        ? gradeEmployees.reduce((sum, e) => sum + e["Annual Salary"], 0) /
            gradeEmployees.length
        : 0;
    });

    charts.salaryGrade.data.labels = grades.map((g) => "Grade " + g);
    charts.salaryGrade.data.datasets[0].data = avgSalaries;
    charts.salaryGrade.update();
  }

  if (charts.location) {
    const countries = [...new Set(filteredEmployees.map((e) => e.Country))];
    const data = countries
      .map((country) => {
        const countryEmployees = filteredEmployees.filter(
          (e) => e.Country === country
        );
        return countryEmployees.length;
      })
      .sort((a, b) => b - a);

    charts.location.data.labels = countries;
    charts.location.data.datasets[0].data = data;
    charts.location.update();
  }

  if (charts.businessUnit) {
    const businessUnits = [
      ...new Set(filteredEmployees.map((e) => e["Business Unit"])),
    ];
    const counts = businessUnits.map(
      (unit) =>
        filteredEmployees.filter((e) => e["Business Unit"] === unit).length
    );

    charts.businessUnit.data.labels = businessUnits;
    charts.businessUnit.data.datasets[0].data = counts;
    charts.businessUnit.update();
  }

  if (charts.bonus) {
    const withBonus = filteredEmployees.filter((e) => e["Bonus %"] > 0).length;
    const withoutBonus = filteredEmployees.filter(
      (e) => e["Bonus %"] === 0
    ).length;

    charts.bonus.data.datasets[0].data = [withBonus, withoutBonus];
    charts.bonus.update();
  }

  if (charts.medicalAge) {
    const ageRanges = ["20-29", "30-39", "40-49", "50-59", "60+"];
    const avgMedical = ageRanges.map((range) => {
      const [min, max] =
        range === "60+" ? [60, 100] : range.split("-").map(Number);
      const employeesInRange = filteredEmployees.filter((e) => {
        const age = e.Age;
        return range === "60+" ? age >= min : age >= min && age <= max;
      });

      return employeesInRange.length > 0
        ? employeesInRange.reduce(
            (sum, e) => sum + (e["Medical Usage"] || 0),
            0
          ) / employeesInRange.length
        : 0;
    });

    charts.medicalAge.data.datasets[0].data = avgMedical;
    charts.medicalAge.update();
  }
}

function createGenderDeptChart(ctx) {
  const departments = [...new Set(filteredEmployees.map((e) => e.Department))];
  const genders = [...new Set(filteredEmployees.map((e) => e.Gender))];

  const datasets = genders.map((gender) => {
    const data = departments.map(
      (dept) =>
        filteredEmployees.filter(
          (e) => e.Department === dept && e.Gender === gender
        ).length
    );

    return {
      label: gender,
      data: data,
      backgroundColor: getColorForGender(gender),
    };
  });

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: departments,
      datasets: datasets,
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
        },
      },
    },
  });
}

function createSalaryGradeChart(ctx) {
  const grades = [
    ...new Set(filteredEmployees.map((e) => e["Job Grade"])),
  ].sort((a, b) => a - b);

  const avgSalaries = grades.map((grade) => {
    const gradeEmployees = filteredEmployees.filter(
      (e) => e["Job Grade"] === grade
    );
    return gradeEmployees.length > 0
      ? gradeEmployees.reduce((sum, e) => sum + e["Annual Salary"], 0) /
          gradeEmployees.length
      : 0;
  });

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: grades.map((g) => "Grade " + g),
      datasets: [
        {
          label: "Average Salary",
          data: avgSalaries,
          backgroundColor: "#3498db",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "RM" + value.toLocaleString();
            },
          },
        },
      },
    },
  });
}

function createLocationChart(ctx) {
  const countries = [...new Set(filteredEmployees.map((e) => e.Country))];
  const data = countries
    .map((country) => {
      const countryEmployees = filteredEmployees.filter(
        (e) => e.Country === country
      );
      return countryEmployees.length;
    })
    .sort((a, b) => b - a);

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: countries,
      datasets: [
        {
          label: "Employee Count",
          data: data,
          backgroundColor: "#3498db",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function createBusinessUnitChart(ctx) {
  const businessUnits = [
    ...new Set(filteredEmployees.map((e) => e["Business Unit"])),
  ];
  const counts = businessUnits.map(
    (unit) =>
      filteredEmployees.filter((e) => e["Business Unit"] === unit).length
  );

  return new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: businessUnits,
      datasets: [
        {
          data: counts,
          backgroundColor: [
            "#3498db",
            "#2ecc71",
            "#e74c3c",
            "#f39c12",
            "#9b59b6",
            "#1abc9c",
          ],
        },
      ],
    },
    options: {
      responsive: true,
    },
  });
}

function createBonusChart(ctx) {
  const withBonus = filteredEmployees.filter((e) => e["Bonus %"] > 0).length;
  const withoutBonus = filteredEmployees.filter(
    (e) => e["Bonus %"] === 0
  ).length;

  return new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["With Bonus", "Without Bonus"],
      datasets: [
        {
          data: [withBonus, withoutBonus],
          backgroundColor: ["#27ae60", "#e74c3c"],
        },
      ],
    },
    options: {
      responsive: true,
    },
  });
}

function createMedicalAgeChart(ctx) {
  const ageRanges = ["20-29", "30-39", "40-49", "50-59", "60+"];
  const avgMedical = ageRanges.map((range) => {
    const [min, max] =
      range === "60+" ? [60, 100] : range.split("-").map(Number);
    const employeesInRange = filteredEmployees.filter((e) => {
      const age = e.Age;
      return range === "60+" ? age >= min : age >= min && age <= max;
    });

    return employeesInRange.length > 0
      ? employeesInRange.reduce(
          (sum, e) => sum + (e["Medical Usage"] || 0),
          0
        ) / employeesInRange.length
      : 0;
  });

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: ageRanges,
      datasets: [
        {
          label: "Average Medical Usage (RM)",
          data: avgMedical,
          backgroundColor: "#9b59b6",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "RM" + value.toLocaleString();
            },
          },
        },
      },
    },
  });
}

function getColorForGender(gender) {
  const colors = {
    Male: "#3498db",
    Female: "#e74c3c",
    Other: "#2ecc71",
  };
  return colors[gender] || "#95a5a6";
}

// Pagination functions
function updatePagination() {
  totalPages = Math.ceil(tableFilteredEmployees.length / rowsPerPage);

  if (currentPage > totalPages) {
    currentPage = totalPages || 1;
  }

  updatePaginationControls();
}

function updatePaginationControls() {
  const paginationInfo = document.getElementById("paginationInfo");
  const startIndex = (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(
    currentPage * rowsPerPage,
    tableFilteredEmployees.length
  );

  paginationInfo.textContent = `Showing ${startIndex} to ${endIndex} of ${tableFilteredEmployees.length} employees`;

  // Update button states
  document.getElementById("firstPage").disabled = currentPage === 1;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
  document.getElementById("lastPage").disabled = currentPage === totalPages;

  // Update page numbers
  const pageNumbersContainer = document.getElementById("pageNumbers");
  pageNumbersContainer.innerHTML = "";

  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement("button");
    pageButton.className = `page-number ${i === currentPage ? "active" : ""}`;
    pageButton.textContent = i;
    pageButton.onclick = () => goToPage(i);
    pageNumbersContainer.appendChild(pageButton);
  }
}

function changeRowsPerPage() {
  rowsPerPage = parseInt(document.getElementById("rowsPerPage").value);
  currentPage = 1;
  updatePagination();
  updateEmployeeTable();
}

function goToPage(page) {
  currentPage = page;
  updatePagination();
  updateEmployeeTable();
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    updatePagination();
    updateEmployeeTable();
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    updatePagination();
    updateEmployeeTable();
  }
}

// Sorting function
function sortTable(columnIndex) {
  const columns = [
    "EEID",
    "Full Name",
    "Job Title",
    "Job Grade",
    "Department",
    "Business Unit",
    "Gender",
    "Ethnicity",
    "Age",
    "Hire Date",
    "Annual Salary",
    "Bonus %",
    "Country",
    "City",
    "Exit Date",
    "Medical Usage",
    "Sheet",
    "Status",
  ];
  const columnName = columns[columnIndex];

  if (currentSort.column === columnName) {
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    currentSort.column = columnName;
    currentSort.direction = "asc";
  }

  tableFilteredEmployees.sort((a, b) => {
    let aValue = a[columnName];
    let bValue = b[columnName];

    // Handle empty values
    if (!aValue && bValue) return currentSort.direction === "asc" ? -1 : 1;
    if (aValue && !bValue) return currentSort.direction === "asc" ? 1 : -1;
    if (!aValue && !bValue) return 0;

    // Handle numeric sorting
    if (
      [
        "Age",
        "Annual Salary",
        "Bonus %",
        "Medical Usage",
        "Job Grade",
      ].includes(columnName)
    ) {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    // Handle date sorting
    if (["Hire Date", "Exit Date"].includes(columnName)) {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    // Handle string sorting
    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return currentSort.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return currentSort.direction === "asc" ? 1 : -1;
    return 0;
  });

  currentPage = 1;
  updatePagination();
  updateEmployeeTable();
}

function updateEmployeeTable() {
  const tbody = document.getElementById("employeeTableBody");
  tbody.innerHTML = "";

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(
    startIndex + rowsPerPage,
    tableFilteredEmployees.length
  );
  const employeesToShow = tableFilteredEmployees.slice(startIndex, endIndex);

  employeesToShow.forEach((employee) => {
    const row = document.createElement("tr");

    row.innerHTML = `
            <td>${employee.EEID || ""}</td>
            <td>${employee["Full Name"] || ""}</td>
            <td>${employee["Job Title"] || ""}</td>
            <td>${employee["Job Grade"] || ""}</td>
            <td>${employee.Department || ""}</td>
            <td>${employee["Business Unit"] || ""}</td>
            <td>${employee.Gender || ""}</td>
            <td>${employee.Ethnicity || ""}</td>
            <td>${employee.Age || ""}</td>
            <td>${
              employee["Hire Date"]
                ? new Date(employee["Hire Date"]).toLocaleDateString()
                : ""
            }</td>
            <td>RM${(employee["Annual Salary"] || 0).toLocaleString()}</td>
            <td>${((employee["Bonus %"] || 0) * 100).toFixed(1)}%</td>
            <td>${employee.Country || ""}</td>
            <td>${employee.City || ""}</td>
            <td>${
              employee["Exit Date"]
                ? new Date(employee["Exit Date"]).toLocaleDateString()
                : "-"
            }</td>
            <td>RM${(employee["Medical Usage"] || 0).toLocaleString()}</td>
            <td>${employee.Sheet || ""}</td>
            <td class="status-${employee.Status.toLowerCase()}">${
      employee.Status
    }</td>
        `;

    tbody.appendChild(row);
  });
}

// Export function
function exportData() {
  const dataToExport = filteredEmployees; // Export filtered data instead of table view

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Data");

  XLSX.writeFile(workbook, "employee_data_export.xlsx");
}

// Update file name display
function updateFileName() {
  const fileInput = document.getElementById("fileInput");
  const fileNameElement = document.getElementById("fileName");

  if (fileInput.files.length > 0) {
    const fileName = fileInput.files[0].name;
    fileNameElement.textContent = fileName;
    fileNameElement.style.color = "#2c3e50";
    fileNameElement.style.fontWeight = "500";
  } else {
    fileNameElement.textContent = "No file selected";
    fileNameElement.style.color = "#555";
    fileNameElement.style.fontWeight = "normal";
  }
}

// SmartBot Implementation
function initializeSmartBot() {
  // Get DOM elements
  const chatbotWidget = document.getElementById("chatbot-widget");
  const chatbotButton = document.getElementById("chatbot-button");
  const chatbotWindow = document.getElementById("chatbot-window");
  const chatbotClose = document.getElementById("chatbot-close");
  const chatbotInput = document.getElementById("chatbot-input");
  const chatbotSend = document.getElementById("chatbot-send");
  const chatbotMessages = document.getElementById("chatbot-messages");
  const chatbotTyping = document.getElementById("chatbot-typing");
  const statusDot = document.querySelector(".status-dot");
  const statusText = document.querySelector(".status-text");

  // Check if elements exist
  if (
    !chatbotWidget ||
    !chatbotButton ||
    !chatbotWindow ||
    !chatbotClose ||
    !chatbotInput ||
    !chatbotSend ||
    !chatbotMessages ||
    !chatbotTyping
  ) {
    console.error("SmartBot: One or more elements not found");
    return;
  }

  // Set initial state
  chatbotWidget.classList.add("minimized");

  // Toggle chatbot window
  chatbotButton.addEventListener("click", function () {
    if (chatbotWidget.classList.contains("minimized")) {
      chatbotWidget.classList.remove("minimized");
      chatbotWidget.classList.add("maximized");
      chatbotInput.focus();
    } else {
      chatbotWidget.classList.remove("maximized");
      chatbotWidget.classList.add("minimized");
    }
  });

  // Close chatbot window
  chatbotClose.addEventListener("click", function () {
    chatbotWidget.classList.remove("maximized");
    chatbotWidget.classList.add("minimized");
  });

  // Send message function
  function sendMessage() {
    const message = chatbotInput.value.trim();
    if (message === "") return;

    // Add user message to chat
    addMessage(message, "user");

    // Clear input
    chatbotInput.value = "";

    // Show typing indicator
    chatbotTyping.style.display = "block";

    // Prepare data for API
    const dataSummary = prepareDataSummary();

    // Send to Python backend
    fetchPythonBackend(message, dataSummary)
      .then((response) => {
        // Hide typing indicator
        chatbotTyping.style.display = "none";

        // Add bot response to chat
        addMessage(response, "bot");
      })
      .catch((error) => {
        // Hide typing indicator
        chatbotTyping.style.display = "none";

        // Add error message
        addMessage(
          "I'm sorry, I encountered an error while processing your request. Please try again later.",
          "bot"
        );
        console.error("SmartBot Error:", error);
      });
  }

  // Add event listeners for send button and enter key
  chatbotSend.addEventListener("click", sendMessage);
  chatbotInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  // Function to add message to chat
  function addMessage(message, sender) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-message", `${sender}-message`);

    const contentElement = document.createElement("div");
    contentElement.classList.add("message-content");

    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    message = message.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');

    // Convert line breaks
    message = message.replace(/\n/g, "<br>");

    contentElement.innerHTML = message;
    messageElement.appendChild(contentElement);

    chatbotMessages.appendChild(messageElement);

    // Scroll to bottom
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  // Function to prepare data summary for API
  function prepareDataSummary() {
    if (allEmployees.length === 0) {
      return "No employee data has been uploaded yet.";
    }

    // Create a summary of the data
    const summary = {
      totalEmployees: allEmployees.length,
      departments: [...new Set(allEmployees.map((e) => e.Department))],
      countries: [...new Set(allEmployees.map((e) => e.Country))],
      jobTitles: [...new Set(allEmployees.map((e) => e["Job Title"]))],
      averageSalary:
        allEmployees.reduce((sum, e) => sum + (e["Annual Salary"] || 0), 0) /
        allEmployees.length,
      averageAge:
        allEmployees.reduce((sum, e) => sum + (e.Age || 0), 0) /
        allEmployees.length,
      genderDistribution: {
        male: allEmployees.filter((e) => e.Gender === "Male").length,
        female: allEmployees.filter((e) => e.Gender === "Female").length,
      },
      sampleData: allEmployees.slice(0, 3), // Include first 3 records as sample
    };

    return JSON.stringify(summary);
  }

  // Function to fetch response from Python backend
  async function fetchPythonBackend(userMessage, dataSummary) {
    const response = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage,
        data_summary: dataSummary,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.response;
  }

  // Function to check chatbot connection
  function checkChatbotConnection() {
    fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "test",
        data_summary: "test",
      }),
    })
      .then((response) => {
        if (response.ok) {
          statusDot.classList.add("connected");
          statusText.textContent = "Connected";
        } else {
          throw new Error("Connection failed");
        }
      })
      .catch((error) => {
        console.error("Chatbot connection error:", error);
        statusDot.classList.add("error");
        statusText.textContent = "Offline";
      });
  }

  // Initialize chatbot with a welcome message
  console.log("SmartBot initialized successfully");

  // Check connection
  checkChatbotConnection();
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  console.log("HR Dashboard loaded. Please upload an Excel file to begin.");

  // Add event listener for file input change
  document.getElementById("fileInput").addEventListener("change", function () {
    updateFileName();
    loadFile();
  });

  // Add event listeners for filters
  document.getElementById("searchInput").addEventListener("input", filterData);
  document
    .getElementById("departmentFilter")
    .addEventListener("change", filterData);
  document
    .getElementById("jobTitleFilter")
    .addEventListener("change", filterData);
  document
    .getElementById("jobGradeFilter")
    .addEventListener("change", filterData);
  document
    .getElementById("genderFilter")
    .addEventListener("change", filterData);
  document
    .getElementById("countryFilter")
    .addEventListener("change", filterData);
  document.getElementById("cityFilter").addEventListener("change", filterData);
  document
    .getElementById("businessUnitFilter")
    .addEventListener("change", filterData);
  document
    .getElementById("ethnicityFilter")
    .addEventListener("change", filterData);
  document.getElementById("bonusFilter").addEventListener("change", filterData);
  document
    .getElementById("exitStatusFilter")
    .addEventListener("change", filterData);

  // Add event listeners for table search
  document.getElementById("tableSearch").addEventListener("input", filterTable);

  // Add event listeners for table filters
  document
    .getElementById("tableDepartmentFilter")
    .addEventListener("change", filterTable);
  document
    .getElementById("tableCountryFilter")
    .addEventListener("change", filterTable);
  document
    .getElementById("tableCityFilter")
    .addEventListener("change", filterTable);
  document
    .getElementById("tableGenderFilter")
    .addEventListener("change", filterTable);
  document
    .getElementById("tableJobTitleFilter")
    .addEventListener("change", filterTable);
  document
    .getElementById("tableBonusFilter")
    .addEventListener("change", filterTable);

  // Add event listeners for pagination
  document
    .getElementById("firstPage")
    .addEventListener("click", () => goToPage(1));
  document.getElementById("prevPage").addEventListener("click", previousPage);
  document.getElementById("nextPage").addEventListener("click", nextPage);
  document
    .getElementById("lastPage")
    .addEventListener("click", () => goToPage(totalPages));
  document
    .getElementById("rowsPerPage")
    .addEventListener("change", changeRowsPerPage);

  // Add event listener for reset buttons
  document
    .getElementById("resetFilters")
    .addEventListener("click", resetFilters);
  document
    .getElementById("resetTableFilters")
    .addEventListener("click", resetTableFilters);

  // Add event listener for export button
  document.getElementById("exportData").addEventListener("click", exportData);

  // Add event listener for toggle filters buttons
  document
    .getElementById("toggleFiltersBtn")
    .addEventListener("click", toggleFilters);
  document
    .getElementById("toggleTableFiltersBtn")
    .addEventListener("click", toggleTableFilters);

  // Initialize SmartBot
  initializeSmartBot();
});
