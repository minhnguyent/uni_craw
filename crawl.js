const Crawler = require('crawler');
const cheerio = require('cheerio');
const mysql = require('mysql2');

// Create a connection pool
const pool = mysql.createPool({
  port: 3306,
  host: 'localhost', // Replace with your MySQL host
  user: 'root', // Replace with your MySQL username
  password: '', // Replace with your MySQL password
  database: 'crawlngoisao' // Replace with your MySQL database name
});
const c = new Crawler();
function convertPriceToNumber(priceString) {
  if (priceString.toLowerCase() === 'liên hệ') {
    lienhe++
    return false; // Keep 'liên hệ' as is
  }
  // Remove 'đ' and commas from the price string
  const cleanPrice = priceString.replace(/[^\d.]/g, '').trim();

  // Parse the cleaned price string as a number
  const priceNumber = parseFloat(cleanPrice);

  return priceNumber;
}

let lienhe = 0;
let duplicateCount = 0;
async function crawlData() {
  const url = [
    { link: 'https://tinhocngoisao.com/collections/cpu-bo-vi-xu-ly', linkId: 1 },
    { link: 'https://tinhocngoisao.com/collections/bo-mach-chu', linkId: 2 },
    { link: 'https://tinhocngoisao.com/collections/bo-nho-ram', linkId: 3 },
    { link: 'https://tinhocngoisao.com/collections/case-thung-may', linkId: 4 },
    { link: 'https://tinhocngoisao.com/collections/card-man-hinh', linkId: 5 },
    { link: 'https://tinhocngoisao.com/collections/psu-nguon-may-tinh', linkId: 6 },
    { link: 'https://tinhocngoisao.com/collections/o-cung-ssd,linkId:', linkId: 7 },
    { link: 'https://tinhocngoisao.com/collections/o-cung-hdd', linkId: 8 },
    { link: 'https://tinhocngoisao.com/collections/the-nho', linkId: 9 },
    { link: 'https://tinhocngoisao.com/collections/usb', linkId: 10 },
    { link: 'https://tinhocngoisao.com/collections/o-cung-di-dong', linkId: 11 }
  ];


  async function processPage(urlObj, pageIndex) {
    return new Promise((resolve) => {
      c.queue({
        uri: urlObj.link + '?page=' + pageIndex,
        callback: (error, res, done) => {
          if (error) {
            console.error('Error:', error);
            done();
            resolve();
          } else {
            const $ = cheerio.load(res.body);
            if ($('.product-item').length === 0) {
              done();
              resolve();
              return;
            }

            $('.product-item').each((index, element) => {
              const name = $(element).find('.productName').text();
              const baseprice = $(element).find('.pdPrice span').text();
              const price = convertPriceToNumber(baseprice);
              const imageURL = $(element).find('picture img').attr('data-src');

              if (!price) {
                lienhe++;
              }

              const true_price = urlObj.linkId === 5 ? price + 300000 : price + 100000;

              const sql = `
                INSERT INTO products (name, src, base_price, price, category_id)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  name = VALUES(name),
                  src = VALUES(src),
                  base_price = VALUES(base_price),
                  price = VALUES(price)
              `;

              pool.query(sql, [name, imageURL, price, true_price, urlObj.linkId], (err, result) => {
                if (err) {
                  if (err.code === 'ER_DUP_ENTRY') {
                    duplicateCount++;
                  }
                  console.error('Error inserting or updating data:', err);
                } else {
                  console.log('Data inserted or updated successfully:', result);
                }
                done();
                resolve();
              });
            });
          }
        }
      });
    });
  }

  for (const urlObj of url) {
    for (let pageIndex = 1; pageIndex < 100; pageIndex++) {
      await processPage(urlObj, pageIndex);
    }
  }

  console.log('Số lần "liên hệ" hoặc giá không phải số:', lienhe);
  console.log('Số lần bị trùng lặp:', duplicateCount);
}

crawlData();