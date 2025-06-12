const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Import the database connection pool

// --- Route to get all products (GET /api/products) ---
// This route will fetch all products from your PostgreSQL database.
router.get('/products', async (req, res) => { // Route path is '/products' within this router
    console.log('Attempting to fetch all products from the database...'); // Log when the route is hit
    try {
        // SQL query to select all products from the 'products' table.
        // It's good practice to explicitly list columns for clarity and performance.
        const getAllProductsQuery = `
            SELECT
                id,
                title,
                image,
                description,
                price,
                category,
                created_at
            FROM
                products
            ORDER BY
                created_at DESC; -- Order by creation date, newest first
        `;

        // Execute the query using the database connection pool.
        // The 'await' keyword ensures that the application waits for the database response
        // before proceeding.
        const result = await pool.query(getAllProductsQuery);

        // Check if any rows were returned by the query.
        if (result.rows.length === 0) {
            console.log('No products found in the database.');
            // If no products are found, send a 200 OK response with an empty array.
            return res.status(200).json({
                message: 'No products available at the moment.',
                products: [] // Send an empty array to the frontend
            });
        }

        console.log(`Successfully fetched ${result.rows.length} products from the database.`);
        // If products are found, send a 200 OK response with the fetched data.
        res.status(200).json({
            message: 'Products retrieved successfully!',
            products: result.rows // 'rows' contains the actual product data as an array of objects
        });

    } catch (error) {
        // If an error occurs during the database query or any other part of the process,
        // log it to the console with detailed information for debugging.
        console.error('ERROR in /api/products route (fetching from DB):', error.message);
        console.error('SQL Error Code:', error.code);   // e.g., '42P01' for undefined_table
        console.error('SQL Error Detail:', error.detail); // More specific error details
        console.error('Error Stack:', error.stack);     // Full stack trace

        // Send a 500 Internal Server Error response to the client.
        res.status(500).json({
            message: 'Server error while fetching products. Please check backend logs for details.',
            error: error.message,
            sqlError: error.code // Optionally send specific SQL error code to client for debugging
        });
    }
});

// Export the router so it can be used by server.js.
module.exports = router;



