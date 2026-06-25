
# 🏥 MediCore API Documentation

Welcome to the core documentation for  MediCore. This document serves as the contract between the frontend and backend teams to allow seamless, parallel development.

---

## 🚀 Project Overview

This platform is a multi-service ecosystem built to handle authentication, role-based access control (RBAC), patient appointment scheduling, digital prescriptions, pharmacy inventory control, real-time doctor-patient communication, and blood bank coordination.

### 👥 System Roles

* **Patient**: Can search for doctors, book appointments, view prescriptions, chat with doctors, and register as blood donors.
* **Doctor**: Can manage appointments, write digital prescriptions, and check historical patient charts. Requires Admin approval before appearing on patient directories.
* **Pharmacist**: Manages medicine stock, prices, and catalog additions.
* **Admin**: Oversees system compliance, specifically approving/rejecting Doctor registration profiles.

---

## 🔑 Global Authentication & Authorization

All protected routes require an HTTP Authorization header containing a JSON Web Token (JWT).

```http
Authorization: Bearer <access_token>

```

### Decoded JWT Access Token Payload Structure

When the token is decoded on either the client or server, it yields the following payload structure:

```json
{
  "userId": "usr_67890abcde",
  "name": "Alex Doe",
  "email": "alex.doe@example.com",
  "role": "doctor",
  "approval": false,
  "iat": 1781942400,
  "exp": 1782028800
}

```

---

## 🛠️ API Endpoint Specifications

### 1. Auth Service

#### 📋 Register User

* **URL:** `http://localhost:3000/api/v1/auth/signup`
* **Method:** `POST`
* **Auth Required:** No
* **Description:** Creates a new user profile. Note that the `approval` flag defaults to `true` for all roles except `doctor`, which defaults to `false`.

**Request Body:**

```json
{
  "name": "Dr. Sarah Jenkins",
  "email": "sarah.jenkins@hospital.com",
  "password": "SecurePassword123!",
  "role": "doctor",
  "phone": "+15550192834",
  "blood_group": "O+"
}

```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "userId": "usr_98765fghij",
    "name": "Dr. Sarah Jenkins",
    "email": "sarah.jenkins@hospital.com",
    "role": "doctor",
    "phone": "+15550192834",
    "blood_group": "O+",
    "approval": false,
    "createdAt": "2026-06-19T02:24:54Z",
    "updatedAt": "2026-06-19T02:24:54Z"
  }
}

```

#### 🔑 Login User

* **URL:** `http://localhost:3000/api/v1/auth/login`
* **Method:** `POST`
* **Auth Required:** No
* **Description:** Validates credentials and returns all user information alongside an RBAC-enabled `accessToken`.

**Request Body:**

```json
{
  "email": "sarah.jenkins@hospital.com",
  "password": "SecurePassword123!"
}

```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Login successful.",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfOTg3NjVmZ2hpaiIsIm5hbWUiOiJEci4gU2FyYWggSmVua2lucyIsImVtYWlsIjoic2FyYWguamVua2luc0Bob3NwaXRhbC5jb20iLCJyb2xlIjoiZG9jdG9yIiwiYXBwcm92YWwiOmZhbHNlfQ...",
  "data": {
    "userId": "usr_98765fghij",
    "name": "Dr. Sarah Jenkins",
    "email": "sarah.jenkins@hospital.com",
    "role": "doctor",
    "phone": "+15550192834",
    "blood_group": "O+",
    "approval": false,
    "createdAt": "2026-06-19T02:24:54Z",
    "updatedAt": "2026-06-19T02:24:54Z"
  }
}

```

---

### 2. User Service

#### 🩺 Get / Update Role Profiles

* **URL:** `http://localhost:3000/api/v1/user/profile`
* **Method:** `PUT`
* **Auth Required:** Yes
* **Description:** Updates role-specific profile details. Fields dynamically alter based on your authenticated account type.

**Request Body (For Doctors):**

```json
{
  "specialization": "Cardiology",
  "qualification": "MD, FACC",
  "location": "Building A, Clinic Suite 402",
  "visiting_fee": 150.00
}

```

**Request Body (For Pharmacists):**

```json
{
  "pharmacy_name": "Central Metro Pharmacy"
}

```

**Success Response (200 OK - Doctor Example):**

```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "data": {
    "userId": "usr_98765fghij",
    "role": "doctor",
    "specialization": "Cardiology",
    "rating": 5.0,
    "qualification": "MD, FACC",
    "location": "Building A, Clinic Suite 402",
    "visiting_fee": 150.00,
    "updatedAt": "2026-06-19T02:30:00Z"
  }
}

```

> **Note:** For `patient` and `admin` roles, updating role profiles returns success but has no additional unique fields.

#### 🔍 Get Approved Doctor Directory *(Added Supplemental Endpoint)*

* **URL:** `http://localhost:3000/api/v1/user/doctors`
* **Method:** `GET`
* **Auth Required:** Yes (Patient/Admin/Pharmacist)
* **Description:** Allows patients to view all active, approved doctors before booking appointments.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "doctorId": "usr_98765fghij",
      "name": "Dr. Sarah Jenkins",
      "specialization": "Cardiology",
      "rating": 4.9,
      "qualification": "MD, FACC",
      "location": "Building A, Clinic Suite 402",
      "visiting_fee": 150.00
    }
  ]
}

```

---

### 3. Patient API

#### 📅 Book Appointment

* **URL:** `http://localhost:3000/api/v1/patient/appointments`
* **Method:** `POST`
* **Auth Required:** Yes (Patient Only)
* **Description:** Files an appointment allocation and prepares an unwritten prescription document container in the database.

**Request Body:**

```json
{
  "doctor_id": "usr_98765fghij",
  "date": "2026-06-25",
  "symptoms": "Occasional acute chest pains during exercise.",
  "transaction_id": "tx_abc123xyz789"
}

```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Appointment booked successfully.",
  "data": {
    "prescriptionID": "prsc_00001a2b3c",
    "patient_id": "usr_111222patient",
    "doctor_info": {
      "doctorId": "usr_98765fghij",
      "name": "Dr. Sarah Jenkins",
      "specialization": "Cardiology"
    },
    "location": "Building A, Clinic Suite 402",
    "date": "2026-06-25",
    "serial_no": 14,
    "symptoms": "Occasional acute chest pains during exercise."
  }
}

```

#### 📄 View Self Prescriptions

* **URL:** `http://localhost:3000/api/v1/patient/prescriptions`
* **Method:** `GET`
* **Auth Required:** Yes (Patient Only)
* **Description:** Returns a historical log of all prescriptions issued to the authenticated patient.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "prescriptionID": "prsc_00001a2b3c",
      "patientId": "usr_111222patient",
      "doctorId": "usr_98765fghij",
      "symptoms": "Occasional acute chest pains during exercise.",
      "description": "Rest prescribed, limit strenuous activity until test results arrive.",
      "medicine_details": [
        {
          "medicine_name": "Aspirin",
          "dosage": "81mg daily",
          "duration": "30 days"
        }
      ],
      "transaction_id": "tx_abc123xyz789"
    }
  ]
}

```

#### 🔍 View Prescriptions by Doctor ID

* **URL:** `http://localhost:3000/api/v1/patient/prescriptions/doctor/usr_98765fghij`
* **Method:** `GET`
* **Auth Required:** Yes (Patient Only)
* **Description:** Filters the current patient's historical prescriptions to those issued by a specific doctor.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "prescriptionID": "prsc_00001a2b3c",
      "patientId": "usr_111222patient",
      "doctorId": "usr_98765fghij",
      "symptoms": "Occasional acute chest pains during exercise.",
      "description": "Rest prescribed, limit strenuous activity until test results arrive.",
      "medicine_details": [
        {
          "medicine_name": "Aspirin",
          "dosage": "81mg daily",
          "duration": "30 days"
        }
      ],
      "transaction_id": "tx_abc123xyz789"
    }
  ]
}

```

---

### 4. Doctor API

#### ✍️ Write Prescription

* **URL:** `http://localhost:3000/api/v1/doctor/prescriptions/prsc_00001a2b3c`
* **Method:** `PUT`
* **Auth Required:** Yes (Doctor Only)
* **Description:** Updates and fills the detailed description and medicine properties for a pre-existing appointment/prescription slot.

**Request Body:**

```json
{
  "description": "Patient exhibits minor hypertension. Reduce dietary sodium intake.",
  "medicine_details": [
    {
      "medicine_name": "Lisinopril",
      "dosage": "10mg daily",
      "duration": "90 days"
    }
  ]
}

```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Prescription successfully issued.",
  "data": {
    "prescriptionID": "prsc_00001a2b3c",
    "patientId": "usr_111222patient",
    "doctorId": "usr_98765fghij",
    "symptoms": "Occasional acute chest pains during exercise.",
    "description": "Patient exhibits minor hypertension. Reduce dietary sodium intake.",
    "medicine_details": [
      {
        "medicine_name": "Lisinopril",
        "dosage": "10mg daily",
        "duration": "90 days"
      }
    ],
    "transaction_id": "tx_abc123xyz789"
  }
}

```

#### 📋 View Prescriptions by Patient ID

* **URL:** `http://localhost:3000/api/v1/doctor/prescriptions/patient/usr_111222patient`
* **Method:** `GET`
* **Auth Required:** Yes (Doctor Only)
* **Description:** Pulls up medical history logs belonging to a single patient for verification.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "prescriptionID": "prsc_00001a2b3c",
      "patientId": "usr_111222patient",
      "doctorId": "usr_98765fghij",
      "symptoms": "Occasional acute chest pains during exercise.",
      "description": "Patient exhibits minor hypertension. Reduce dietary sodium intake.",
      "medicine_details": [
        {
          "medicine_name": "Lisinopril",
          "dosage": "10mg daily",
          "duration": "90 days"
        }
      ],
      "transaction_id": "tx_abc123xyz789"
    }
  ]
}

```

#### 🗓️ Show Appointed Patient List

* **URL:** `http://localhost:3000/api/v1/doctor/appointments`
* **Method:** `GET`
* **Auth Required:** Yes (Doctor Only)
* **Description:** Returns structural information on all queues mapped to the logged-in Doctor, highlighting status classifications (`complete` vs `incomplete`).

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "incomplete": [
      {
        "serial_no": 14,
        "date": "2026-06-25",
        "patient_id": "usr_111222patient",
        "name": "Jane Miller",
        "phone": "+15559876543",
        "symptoms": "Occasional acute chest pains during exercise."
      }
    ],
    "complete": [
      {
        "serial_no": 13,
        "date": "2026-06-19",
        "patient_id": "usr_000999patient",
        "name": "Bob Vance",
        "phone": "+15551234567",
        "symptoms": "Follow up consultation post-surgery."
      }
    ]
  }
}

```

---

### 5. Admin API

#### ✅ Approve Doctor

* **URL:** `http://localhost:3000/api/v1/admin/approve-doctor/usr_98765fghij`
* **Method:** `PATCH`
* **Auth Required:** Yes (Admin Only)
* **Description:** Switches the `approval` database Boolean flag to `true` for a doctor, permitting them to join patient search listings.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Doctor status has been updated to Approved.",
  "data": {
    "doctorId": "usr_98765fghij",
    "name": "Dr. Sarah Jenkins",
    "role": "doctor",
    "approval": true,
    "updatedAt": "2026-06-19T02:45:00Z"
  }
}

```

---

### 6. Pharmacist API

#### 📦 View Medicine Stock

* **URL:** `http://localhost:3000/api/v1/pharmacist/medicines`
* **Method:** `GET`
* **Auth Required:** Yes (Pharmacist/Doctor/Patient)
* **Description:** Retrieves a complete view of the current pharmacy stock catalog data.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "medicine_id": "med_abc123",
      "medicine_name": "Lisinopril",
      "price": 12.50,
      "quantity": 450
    },
    {
      "medicine_id": "med_xyz789",
      "medicine_name": "Aspirin",
      "price": 4.99,
      "quantity": 1200
    }
  ]
}

```

#### 🔄 Update Medicine Stock

* **URL:** `http://localhost:3000/api/v1/pharmacist/medicines/med_abc123`
* **Method:** `PUT`
* **Auth Required:** Yes (Pharmacist Only)
* **Description:** Modifies unit pricing or shifts structural volume stock inventories for a specific item identifier.

**Request Body:**

```json
{
  "price": 14.00,
  "quantity": 600
}

```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Medicine inventory details altered successfully.",
  "data": {
    "medicine_id": "med_abc123",
    "medicine_name": "Lisinopril",
    "price": 14.00,
    "quantity": 600
  }
}

```

#### ➕ Add Medicine

* **URL:** `http://localhost:3000/api/v1/pharmacist/medicines`
* **Method:** `POST`
* **Auth Required:** Yes (Pharmacist Only)
* **Description:** Appends a brand-new component record into the systems database ledger.

**Request Body:**

```json
{
  "medicine_name": "Ibuprofen 400mg",
  "price": 6.25,
  "quantity": 350
}

```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Medicine added successfully to catalog.",
  "data": {
    "medicine_id": "med_new555",
    "medicine_name": "Ibuprofen 400mg",
    "price": 6.25,
    "quantity": 350
  }
}

```

---

#### System Users Statistics Dashboard

   * **URL:** `http://localhost:3000/api/v1/user/admin/dashboard/stats`

   * **Method:** `GET`

   * **Auth Required:** Yes (Admin Only)

   * **Description:** Generates aggregate registration numbers divided across roles to assist system reporting.

Success Response (200 OK):

```json
{
    "data": {
        "breakdown": {
            "pharmacists": 2,
            "patients": 5,
            "doctors_approved": 5,
            "doctors_pending": 9
        },
        "total_users": 21
    },
    "success": true
}

```

---


3. Patient Experience & Discovery Extensions
 Filter Doctors by Specialty or Location

    * **URL:** `http://localhost:8002/api/v1/user/doctors/search?specialization=Cardiology&location=Building%20A`

   * **Method:** `GET`

   * **Auth Required:** Yes (Patient Only)

   * **Description:** Extends your basic static doctor directory by introducing dynamic parameters to help patients pinpoint exactly who they need.

Success Response (200 OK):
   ```json
 {
    "data": [
        {
            "qualification": "MD, FACC",
            "doctorId": "usr_9b8e7afbad",
            "rating": 5.0,
            "name": "Dr. Sarah Jenkins",
            "specialization": "Cardiology",
            "location": "Building A, Clinic Suite 402",
            "visiting_fee": 150.0
        },
        {
            "qualification": "MD, FACC",
            "doctorId": "usr_b9e82c295b",
            "rating": 5.0,
            "name": "Dr. Sarah Jenkins",
            "specialization": "Cardiology",
            "location": "Building A, Clinic Suite 402",
            "visiting_fee": 150.0
        },
        {
            "qualification": "MD, FACC",
            "doctorId": "usr_60ace5b3f5",
            "rating": 5.0,
            "name": "Dr. Sarah Jenkins",
            "specialization": "Cardiology",
            "location": "Building A, Clinic Suite 402",
            "visiting_fee": 150.0
        }
    ],
    "success": true,
    "filters_applied": {
        "specialization": "Cardiology",
        "location": "Building A"
    }
}

```

---


### 7. Communication Service

#### 💬 Send Message

* **URL:** `http://localhost:3000/api/v1/chat/send`
* **Method:** `POST`
* **Auth Required:** Yes (Patient/Doctor Only)
* **Description:** Submits a chat message between a patient and a doctor.

**Request Body:**

```json
{
  "doctorId": "usr_98765fghij",
  "patientId": "usr_111222patient",
  "message": "Hello Dr. Jenkins, I have a quick follow-up question regarding my dosage."
}

```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "messageId": "msg_0123456",
    "doctorId": "usr_98765fghij",
    "patientId": "usr_111222patient",
    "message": "Hello Dr. Jenkins, I have a quick follow-up question regarding my dosage.",
    "created_at": "2026-06-19T02:24:54Z",
    "updated_at": "2026-06-19T02:24:54Z"
  }
}

```

#### 📂 Show All Messages

* **URL:** `http://localhost:3000/api/v1/chat/messages?doctorId=usr_98765fghij&patientId=usr_111222patient`
* **Method:** `GET`
* **Auth Required:** Yes (Patient/Doctor Only)
* **Description:** Fetches historical messaging interaction logs between the specified doctor and patient parameters.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "messageId": "msg_0123456",
      "doctorId": "usr_98765fghij",
      "patientId": "usr_111222patient",
      "message": "Hello Dr. Jenkins, I have a quick follow-up question regarding my dosage.",
      "created_at": "2026-06-19T02:24:54Z",
      "updated_at": "2026-06-19T02:24:54Z"
    }
  ]
}

```

---

### 8. Bloodbank Service

#### 🩸 Register Donor

* **URL:** `http://localhost:3000/api/v1/bloodbank/donor/register`
* **Method:** `POST`
* **Auth Required:** Yes (Patient Only)
* **Description:** Registers the authenticated user as a donor in the system database. Uses the user's registered name, profile details, and blood group.

**Request Body:**

```json
{
  "lastdate": "2026-03-15"
}

```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Donor profile registered successfully.",
  "data": {
    "bloodBankId": "bb_donor_999",
    "name": "Jane Miller",
    "contactNo": "+15559876543",
    "donorId": "usr_111222patient",
    "lastdate": "2026-03-15",
    "bloodgroup": "O+"
  }
}

```

#### 🔍 Show Donor List by Blood Group

* **URL:** `http://localhost:3000/api/v1/bloodbank/donors?bloodGroup=O%2B`
* **Method:** `GET`
* **Auth Required:** Yes
* **Description:** Queries the donation ledger indexes to return all matching donors filtered by the required blood group. Use standard URL encoding for signs (e.g., `O+` becomes `O%2B`).

**Success Response (200 OK):**

```json
{
  "success": true,
  "bloodgroup_filtered": "O+",
  "data": [
    {
      "bloodBankId": "bb_donor_999",
      "name": "Jane Miller",
      "contactNo": "+15559876543",
      "donorId": "usr_111222patient",
      "lastdate": "2026-03-15",
      "bloodgroup": "O+"
    }
  ]
}

```

---

### 🛑 Standard Error Code Responses Reference

#### 401 Unauthorized

Returned when the `Authorization` bearer token missing, invalid, or expired.

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Access token is missing or has expired."
}

```

#### 403 Forbidden

Returned when user's RBAC role does not possess the permissions necessary to access the resource (e.g., a patient accessing Admin routes).

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "You do not have permission to access this resource."
}

```
