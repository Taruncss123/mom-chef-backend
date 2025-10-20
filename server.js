const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { Parser } = require('json2csv');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// File paths - All data files are now at the root with the server.
const menuFilePath = path.join(__dirname, 'menu.json');
const ordersFilePath = path.join(__dirname, 'orders.json');
const reservationsFilePath = path.join(__dirname, 'reservations.json');
const customersFilePath = path.join(__dirname, 'customers.json');

// Helper function to read data
const readData = async (filePath) => {
    try {
        await fs.access(filePath);
        const data = await fs.readFile(filePath, 'utf8');
        if (data === '') return [];
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await writeData(filePath, []);
            return [];
        }
        throw error;
    }
};

// Helper function to write data
const writeData = async (filePath, data) => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// --- API ROUTES ---

// Simple root route to confirm the API is running
app.get('/', (req, res) => {
    res.send('The Mom Chef API is running!');
});

// Get the full menu
app.get('/api/menu', async (req, res) => {
    try {
        const menuData = await readData(menuFilePath);
        res.json(menuData);
    } catch (error) {
        console.error('Error reading menu file:', error);
        res.status(500).json({ message: 'Error loading menu' });
    }
});


// Customer Sign-up
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, phone, street, city, state, pincode, dob, password } = req.body;
        const customers = await readData(customersFilePath);
        const existingCustomer = customers.find(customer => customer.email === email);
        if (existingCustomer) {
            return res.status(400).json({ message: 'A customer with this email already exists.' });
        }
        const newCustomer = { id: Date.now(), name, email, phone, street, city, state, pincode, dob, signupDate: new Date().toISOString() };
        customers.push(newCustomer);
        await writeData(customersFilePath, customers);
        res.status(201).json({ message: 'Customer registered successfully!', customer: newCustomer });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Failed to register customer.' });
    }
});

// Submit an order
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = { id: Date.now(), date: new Date().toISOString(), ...req.body };
        const orders = await readData(ordersFilePath);
        orders.push(newOrder);
        await writeData(ordersFilePath, orders);
        res.status(201).json({ message: 'Order received!', order: newOrder });
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({ message: 'Failed to save order' });
    }
});

// Submit a reservation
app.post('/api/reservations', async (req, res) => {
    try {
        const newReservation = { id: Date.now(), date: new Date().toISOString(), ...req.body };
        const reservations = await readData(reservationsFilePath);
        reservations.push(newReservation);
        await writeData(reservationsFilePath, reservations);
        res.status(201).json({ message: 'Reservation received!', reservation: newReservation });
    } catch (error) {
        console.error('Error saving reservation:', error);
        res.status(500).json({ message: 'Failed to save reservation' });
    }
});

// Update the menu (from admin panel)
app.post('/api/update-menu', async (req, res) => {
    const { password, menu } = req.body;
    if (password !== "themomchef@123") {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        await writeData(menuFilePath, menu);
        res.status(200).json({ message: 'Menu updated successfully!' });
    } catch (error) {
        console.error('Error updating menu:', error);
        res.status(500).json({ message: 'Failed to update menu' });
    }
});

// Get all customers (for admin panel)
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await readData(customersFilePath);
        res.json(customers);
    } catch (error) {
        console.error('Error reading customers file:', error);
        res.status(500).json({ message: 'Error loading customers' });
    }
});

// --- DATA EXPORT ROUTES ---
app.get('/api/export-orders', async (req, res) => {
    try {
        const orders = await readData(ordersFilePath);
        if (orders.length === 0) return res.status(200).send('No orders to export.');
        const csv = new Parser().parse(orders);
        res.header('Content-Type', 'text/csv').attachment('orders.csv').send(csv);
    } catch (error) {
        console.error('Error exporting orders:', error);
        res.status(500).json({ message: 'Failed to export orders.' });
    }
});

app.get('/api/export-reservations', async (req, res) => {
    try {
        const reservations = await readData(reservationsFilePath);
        if (reservations.length === 0) return res.status(200).send('No reservations to export.');
        const csv = new Parser().parse(reservations);
        res.header('Content-Type', 'text/csv').attachment('reservations.csv').send(csv);
    } catch (error) {
        console.error('Error exporting reservations:', error);
        res.status(500).json({ message: 'Failed to export reservations.' });
    }
});

app.get('/api/export-customers', async (req, res) => {
    try {
        const customers = await readData(customersFilePath);
        if (customers.length === 0) return res.status(200).send('No customers to export.');
        const csv = new Parser().parse(customers);
        res.header('Content-Type', 'text/csv').attachment('customers.csv').send(csv);
    } catch (error) {
        console.error('Error exporting customers:', error);
        res.status(500).json({ message: 'Failed to export customers.' });
    }
});


app.listen(PORT, () => {
    console.log(`The Mom Chef backend server is running on http://localhost:${PORT}`);
});

