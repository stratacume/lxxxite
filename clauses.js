frontend/clauses.js

const clauses = [
    { id: "lim-report", label: "Subject to LIM Report" },
    { id: "finance", label: "Subject to Finance Approval" },
    { id: "inspection", label: "Subject to Building Inspection" }
];

function renderClauses() {
    const clauseOptions = document.getElementById("clause-options");
    clauses.forEach(clause => {
        const div = document.createElement("div");
        div.innerHTML = `
            <input type="checkbox" name="clauses" value="${clause.id}">
            <label for="${clause.id}">${clause.label}</label>
        `;
        clauseOptions.appendChild(div);
    });
}