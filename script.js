// ==========================
// Utility Functions
// ==========================
function getLoggedInUser() {
    const user = localStorage.getItem("loggedInUser");
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}

// Ensure login on every page
document.addEventListener("DOMContentLoaded", () => {
    const user = getLoggedInUser();
    if (!user && !window.location.href.includes("login.html")) {
        alert("You must log in first!");
        window.location.href = "login.html";
    } else if (user) {
        const welcome = document.getElementById("welcomeUser");
        if (welcome) {
            welcome.innerText = `Welcome, ${user.name}`;
        }
    }
});

// ==========================
// Data Stores (Replace with DB later)
// ==========================
let employees = [];
let attendance = [];
let leaveApplications = [];

// ==========================
// Employees
// ==========================
function renderEmployees() {
    const table = document.getElementById("employeeTable");
    if (!table) return;

    table.innerHTML = "";
    employees.forEach((emp, index) => {
        let row = `<tr>
            <td>${emp.id}</td>
            <td>${emp.name}</td>
            <td>${emp.department}</td>
            <td>${emp.position}</td>
            <td>
                <button onclick="deleteEmployee(${index})">Delete</button>
            </td>
        </tr>`;
        table.innerHTML += row;
    });
}

function deleteEmployee(index) {
    employees.splice(index, 1);
    renderEmployees();
}

// ==========================
// Attendance
// ==========================


// ==========================
// Leave Applications
// ==========================


//manager.html  page code
document.addEventListener("DOMContentLoaded", () => {
  const employeeTableBody = document.getElementById("employeeDirectoryBody");
  const addEmployeeBtn = document.querySelector(".fas.fa-user-plus").parentElement;

  // Fetch and render employees
  async function loadEmployees() {
    const res = await fetch("/api/employees");
    const employees = await res.json();

    employeeTableBody.innerHTML = "";
    employees.forEach(emp => {
      const row = `
        <tr>
          <td>${emp.id}</td>
          <td>${emp.name}</td>
          <td>${emp.department}</td>
          <td>${emp.position}</td>
          <td>${emp.email}</td>
          <td>${emp.phone}</td>
          <td>${emp.status}</td>
          <td><button class="delete-btn" data-id="${emp.id}">Delete</button></td>
        </tr>`;
      employeeTableBody.insertAdjacentHTML("beforeend", row);
    });

    // Delete employee
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        await fetch(`/api/employees/${id}`, { method: "DELETE" });
        loadEmployees();
      });
    });
  }

  // Add employee (simple prompt, can replace with modal form)
  addEmployeeBtn.addEventListener("click", async () => {
    const id = prompt("Enter Employee ID:");
    const name = prompt("Enter Name:");
    const department = prompt("Enter Department:");
    const position = prompt("Enter Position:");
    const email = prompt("Enter Email:");
    const phone = prompt("Enter Phone:");
    const status = prompt("Enter Status (Active/Inactive):");

    if (id && name) {
      await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, department, position, email, phone, status })
      });
      loadEmployees();
    }
  });

  loadEmployees();
});




//-------------------------------Apply leave--------------------------------------------
 // Show the modal
function showLeaveApplyModal() {
  const modal = document.getElementById('leaveApplyModal');
  modal.style.display = 'block';
}

// Close the modal
function closeLeaveApplyModal() {
  const modal = document.getElementById('leaveApplyModal');
  modal.style.display = 'none';
}

// Optional: close modal when clicking outside it
window.addEventListener('click', function (event) {
  const modal = document.getElementById('leaveApplyModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

// Optional: close on ESC key
window.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    closeLeaveApplyModal();
  }
});

//======show employee directory========================
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.classList.remove('active'));

    const section = document.getElementById(sectionId);
    section.classList.add('active');
}
document.addEventListener('DOMContentLoaded', () => {
    const leaveTypeButtons = document.querySelectorAll('.leave-type-btn');

    leaveTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'active' class from all buttons
            leaveTypeButtons.forEach(btn => btn.classList.remove('active'));
            // Add 'active' class to the clicked button
            button.classList.add('active');
        });
    });

    // You can add more JavaScript logic here for form submission, etc.
    // For example, to handle the submit button:
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default form submission

        // In a real application, you would collect form data and send it to a server
        const employeeId = document.getElementById('employeeId').value;
        const selectedLeaveType = document.querySelector('.leave-type-btn.active').textContent;
        const balance = document.getElementById('balance').value;

        console.log({
            employeeId,
            selectedLeaveType,
            balance
        });

        alert('Leave balance submitted! (Check console for data)');
        // Optionally, redirect back to the leave master page or clear the form
        // location.href='index.html';
    });
});
  (function loadEmployeeIdsWhenReady() {
    async function loadEmployeeIds() {
      const dropdown = document.getElementById('employeeId');
      if (!dropdown) return;
      // show temporary loading state
      dropdown.innerHTML = '<option value="" disabled selected>Loading...</option>';

      try {
        const res = await fetch('/api/userids');
        if (!res.ok) {
          const msg = `${res.status} ${res.statusText}`;
          console.error('Error fetching user IDs:', msg);
          // populate with a small sample so UI remains usable during development
          populateSampleIds(dropdown, `Error: ${msg}`);
          return;
        }

        const data = await res.json();
        console.log('Fetched data from backend:', data);

        // reset dropdown
        dropdown.innerHTML = '<option value="" disabled selected>Select Employee ID</option>';

        if (!Array.isArray(data) || data.length === 0) {
          // if empty, fall back to sample IDs for development convenience
          populateSampleIds(dropdown, 'No employees found (sample)');
          return;
        }

        // If array of strings
        if (typeof data[0] === 'string') {
          data.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.innerText = id;
            dropdown.appendChild(option);
          });
          return;
        }

        // If array of objects, try to pick common fields
        data.forEach(row => {
          const id = row?.userid ?? row?.user_id ?? row?.id ?? Object.values(row)[0];
          if (!id) return;
          const option = document.createElement('option');
          option.value = id;
          option.innerText = id;
          dropdown.appendChild(option);
        });
      } catch (err) {
        console.error('Failed to load employee IDs:', err);
        populateSampleIds(dropdown, `Error: ${err.message}`);
      }
    }
});

