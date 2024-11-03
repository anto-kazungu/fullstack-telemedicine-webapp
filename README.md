# Fullstack Telemedicine Webapp
A full-stack telemedicine app for managing health records.

# Clinic Data Management System

A data management solution designed for small to mid-sized clinics to streamline patient, provider, and visit records. This application simplifies clinic operations by providing an intuitive interface for data handling, ensuring secure, efficient, and accurate management of healthcare data.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the Project](#running-the-project)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Patient Management**: Add, update, and remove patient records.
- **Provider Management**: Track and manage provider details.
- **Visit & Discharge Records**: Easily log and update visit and discharge information.
- **Secure Authentication**: User login system to protect sensitive data.
- **Responsive UI**: Built with EJS and CSS, providing a user-friendly interface.

## Prerequisites

- **Node.js**: Download and install from [https://nodejs.org](https://nodejs.org)
- **MySQL Server & MySQL Workbench**: Download from [https://dev.mysql.com/downloads/workbench/](https://dev.mysql.com/downloads/workbench/)

## Installation

1. **Clone the Repository**:
    ```bash
    git clone https://github.com/anto-kazungu/fullstack-telemedicine-webapp
    ```
    ```bash
    cd fullstack-telemedicine-webapp
    ```

2. **Install Dependencies**:
    ```bash
    npm install
    ```

## Database Setup

1. **Start MySQL Server**: Open MySQL Workbench and connect to your local MySQL server.

2. **Create Database and Tables**:
   Import the file `setup/hospital.sql` into your Mysql Workbench

3. **Update Database Configuration**:
   Create a `.env` file in the root directory to store your database connection details:

    ```plaintext
    DB_HOST='localhost'
    DB_USER='root'
    DB_PASSWORD='your_password'
    DB_NAME='hospital'
    PORT='3300'
    ```

## Running the Project

1. **Start the Application**:
    ```bash
    nodemon server.js
    ```

2. **Access the Application**:
   Open your web browser and go to [http://localhost:3300](http://localhost:3300).

## Usage

- **Login**: Register or login as an authorized user to access the main dashboard.
- **Dashboard**: View key metrics and access patient, provider, and visit data.
- **Manage Records**: Easily add, update, or delete records from the user-friendly interface.

## Project Structure

- `views/`: Contains the EJS templates for the application.
- `public/`: Stores static files (CSS, images, JavaScript).

## Contributing

Feel free to submit issues or pull requests to enhance the project. Contributions are welcome!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

