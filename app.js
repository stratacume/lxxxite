frontend/app.js

// Initialize Firebase Auth
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById("auth-section").style.display = "none";
        document.getElementById("main-section").style.display = "block";
        document.getElementById("logout-button").style.display = "block";
        loadProperties();
    } else {
        document.getElementById("auth-section").style.display = "block";
        document.getElementById("main-section").style.display = "none";
        document.getElementById("logout-button").style.display = "none";
    }
});

// Sign Up
function signUp() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            alert("Sign up successful!");
        })
        .catch(error => {
            alert("Error: " + error.message);
        });
}

// Login
function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            alert("Login successful!");
        })
        .catch(error => {
            alert("Error: " + error.message);
        });
}

// Logout
function logout() {
    auth.signOut().then(() => {
        alert("Logged out!");
    });
}

// Load Properties
function loadProperties() {
    const propertyList = document.getElementById("property-list");
    propertyList.innerHTML = "";
    db.collection("properties").get().then(querySnapshot => {
        querySnapshot.forEach(doc => {
            const property = doc.data();
            const div = document.createElement("div");
            div.className = "property-card";
            div.innerHTML = `
                <h3>${property.address}</h3>
                <p>${property.description}</p>
                <p>Price: NZD ${property.price}</p>
                <p>Contact: ${property.sellerContact}</p>
            `;
            if (property.imageUrls && property.imageUrls.length > 0) {
                const img = document.createElement("img");
                img.src = property.imageUrls[0];
                div.appendChild(img);
            }
            propertyList.appendChild(div);
        });
    });
}

// List Property
document.getElementById("property-form").addEventListener("submit", e => {
    e.preventDefault();
    const address = document.getElementById("address").value;
    const description = document.getElementById("description").value;
    const price = document.getElementById("price").value;
    const sellerContact = document.getElementById("seller-contact").value;
    const images = document.getElementById("images").files;

    if (images.length > 10) {
        alert("Maximum 10 images allowed!");
        return;
    }

    const uploadPromises = Array.from(images).map(file => {
        const ref = storage.ref(`properties/${file.name}`);
        return ref.put(file).then(() => ref.getDownloadURL());
    });

    Promise.all(uploadPromises).then(imageUrls => {
        return db.collection("properties").add({
            address,
            description,
            price,
            sellerContact,
            imageUrls
        });
    }).then(() => {
        alert("Property listed!");
        loadProperties();
        document.getElementById("property-form").reset();
    }).catch(error => {
        alert("Error: " + error.message);
    });
});

// Generate Agreement PDF
function generateAgreement() {
    const buyer = document.getElementById("buyer").value;
    const seller = document.getElementById("seller").value;
    const propertyAddress = document.getElementById("property-address").value;
    const selectedClauses = Array.from(document.getElementsByName("clauses"))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => clauses.find(clause => clause.id === checkbox.value).label);

    const agreementWindow = window.open("agreement_template.html");
    agreementWindow.onload = function() {
        agreementWindow.document.getElementById("buyer-name").innerText = buyer;
        agreementWindow.document.getElementById("seller-name").innerText = seller;
        agreementWindow.document.getElementById("property-address").innerText = propertyAddress;
        agreementWindow.document.getElementById("seller-contact").innerText = document.getElementById("seller-contact").value;

        const clauseList = agreementWindow.document.getElementById("selected-clauses");
        selectedClauses.forEach(clause => {
            const li = agreementWindow.document.createElement("li");
            li.innerText = clause;
            clauseList.appendChild(li);
        });

        html2pdf().from(agreementWindow.document.body).save("agreement.pdf");
    };
}

// Forward to Lawyer
async function forwardToLawyer() {
    const lawyerEmail = document.getElementById("lawyer-email").value;

    // Generate PDF and convert to base64
    const agreementWindow = window.open("agreement_template.html");
    await new Promise(resolve => agreementWindow.onload = resolve);
    agreementWindow.document.getElementById("buyer-name").innerText = document.getElementById("buyer").value;
    agreementWindow.document.getElementById("seller-name").innerText = document.getElementById("seller").value;
    agreementWindow.document.getElementById("property-address").innerText = document.getElementById("property-address").value;
    agreementWindow.document.getElementById("seller-contact").innerText = document.getElementById("seller-contact").value;

    const clauseList = agreementWindow.document.getElementById("selected-clauses");
    const selectedClauses = Array.from(document.getElementsByName("clauses"))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => clauses.find(clause => clause.id === checkbox.value).label);
    selectedClauses.forEach(clause => {
        const li = agreementWindow.document.createElement("li");
        li.innerText = clause;
        clauseList.appendChild(li);
    });

    const pdf = await html2pdf().from(agreementWindow.document.body).output('datauristring');
    const base64 = pdf.split(',')[1];

    const response = await fetch('https://lss-backend.vercel.app/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            to: lawyerEmail,
            subject: 'Sale & Purchase Agreement',
            text: 'Please find the Sale & Purchase Agreement attached.',
            attachment: base64,
            filename: 'agreement.pdf'
        })
    });

    if (response.ok) {
        alert("Agreement forwarded to lawyer/conveyancer!");
    } else {
        alert("Error forwarding agreement.");
    }
}

// Render Clauses
renderClauses();