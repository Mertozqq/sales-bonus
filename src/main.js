/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   const discount = 1 - (purchase.discount /100);
   return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index == 0) {
        return seller.profit * 0.15;
    }
    else if (index == 1 || index == 2) {
        return seller.profit * 0.10;
    }
    else if (index - (total - 1) != 0) {
        return seller.profit * 0.05;
    }
    else {
        return 0;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    const { calculateRevenue, calculateBonus } = options;
    if (!data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.customers) ||
        !Array.isArray(data.purchase_records) ||
        data.sellers.length == 0 ||
        data.products.length == 0 ||
        data.customers.length == 0 ||
        data.purchase_records.length == 0) {
            throw new Error('Некорректные входные данные');
    }
    if (calculateRevenue == undefined ||
        calculateBonus == undefined ||
        typeof calculateRevenue !== "function" ||
        typeof calculateBonus !== "function") {
            throw new Error('Чего-то не хватает');
    }

    const sellerStats = Object.fromEntries(
        data.sellers.map(seller => [
            seller.id,
            {
                seller_id: seller.id,
                name: `${seller.first_name} ${seller.last_name}`,
                revenue: 0,
                sales_count: 0,
                profit: 0,
                bonus: 0,
                top_products: []
            }
        ])
    );
    const sellerIndex = Object.fromEntries(
        data.sellers.map(({ id, first_name, last_name, start_date, position }) => [
            id,
            { id, first_name, last_name, start_date, position }
        ])
    );
    const productIndex = Object.fromEntries(
        data.products.map(({ name, category, sku, purchase_price, sale_price }) => [
            sku,
            { name, category, sku, purchase_price, sale_price }
        ])
    )

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller.sales_count) {
            seller.sales_count = 0;
        }
        if (!seller.revenue) {
            seller.revenue = 0;
        }
        record.items.forEach(item => {
            const product = productIndex[item.sku]
            if (!seller.products_sold) {
                seller.products_sold = [];
            }
            if (!seller.products_sold.some((prod) => prod.sku == item.sku)) {
                const skup = ['sku' ,item.sku];
                const quantityp = ['quantity', 0];
                seller.products_sold.push(Object.fromEntries([skup, quantityp]));
            }
            if (!seller.profit) {
                seller.profit = 0;
            }

            const index = seller.products_sold.findIndex(prod => prod.sku == item.sku);
            seller.products_sold[index].quantity += item.quantity;
            const cost = product.purchase_price * item.quantity;
            seller.revenue += +calculateRevenue(item, product).toFixed(2);
            seller.profit += calculateRevenue(item, product) - cost;
        })

        seller.sales_count += 1;
        sellerStats[seller.id].revenue = seller.revenue;
        sellerStats[seller.id].profit = seller.profit;
        sellerStats[seller.id].sales_count = seller.sales_count;
        sellerStats[seller.id].top_products = seller.products_sold;
    })

    //Упорядочивание товаров по количеству
    Object.values(sellerStats).forEach(seller => {
        sellerStats[seller.seller_id].top_products.sort((a, b) => b.quantity - a.quantity);
    })
     Object.values(sellerStats).forEach(seller => {
        sellerStats[seller.seller_id].top_products.splice(10);
     })

    const sellersArray = Object.entries(sellerStats);
    sellersArray.sort((a, b) =>  {
        return b[1].profit - a[1].profit
    });
    
    const result = sellersArray.map(sellerEntry => sellerEntry[1]);
    
    // Расчет бонуса и конечные преобразования
    result.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, result.length, seller);
        seller.bonus = +seller.bonus.toFixed(2);
        seller.profit = +seller.profit.toFixed(2);
        seller.revenue = +seller.revenue.toFixed(2);
    })
    return result;
}