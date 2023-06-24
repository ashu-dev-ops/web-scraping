const puppeteer = require("puppeteer");

const { createObjectCsvWriter } = require("csv-writer");

const csvWriter = createObjectCsvWriter({
  path: "data.csv",
  header: [
    { id: "serialNumber", title: "serialNumber" },
    { id: "arn", title: "ARN" },
    { id: "holderName", title: "Holder Name" },
    { id: "address", title: "Address" },
    { id: "pin", title: "PIN" },
    { id: "email", title: "Email" },
    { id: "city", title: "City" },
    { id: "telephoneResidential", title: "Home Telephone" },
    { id: "telephoneOffice", title: "Office Telephone" },
    { id: "ValidFrom", title: "Valid From" },
    { id: "validTill", title: "Valid Till" },
    { id: "kydCompliant", title: "KYD Compliant" },
    { id: "euin", title: "EUIN" },
    { id: "cityTwo", title: "EUIN" },
    
  ],
});

function timeout(timeInMs) {
  return new Promise((resolve) => setTimeout(resolve, timeInMs));
}

let printCity = null;
let count = 0;
let cityCounter = [];
async function scrapeCities(cityIndex) {
  const browser = await puppeteer.launch({
    headless: false,
    waitForInitialPage: true,
    timeout: 0,
    // protocolTimeout: 3000,
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(
      "https://www.amfiindia.com/locate-your-nearest-mutual-fund-distributor-details"
    );

    await page.reload({
      waitUntil: ["load", "domcontentloaded", "networkidle0"],
    });

    // Verify if the select element is present
    const elementExists = await page.evaluate(() => {
      return !!document.querySelector("#NearestFinAdvisorsCity");
    });

    if (!elementExists) {
      throw new Error("Element not found on the page");
    }

    const cities = await page.evaluate(() => {
      const selectElement = document.querySelector("#NearestFinAdvisorsCity");
      const cityOptions = Array.from(selectElement.options);

      return cityOptions
        .map((option) => option.value)
        .filter((value) => value !== "");
    });
    console.log(cities);
    if (cityCounter.length >= 1) {
      console.log("removing existing cities");
      cities.splice(0, cityCounter);
      console.log(cityCounter);
      console.log(cities);
    }
    if (cityCounter === cities.length) {
      await browser.close();
      return console.log(
        "task completed >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>."
      );
    }
    for (const city of cities) {
      if (city === "-----") {
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>current city");
        console.log(city);
        continue;
      }
      cityCounter.push({ indexOfCity: count++, index: count, city: city });
      console.log(city);
      printCity = city;
      await page.select("#NearestFinAdvisorsCity", city);
      await page.evaluate(() => {
        const radioButton = document.querySelector('input[value="Individual"]');
        radioButton.checked = true;
      });

      await page.click("#hrfGo");

      await page.waitForSelector("#divExcel table", { timeout: 0 });

      // Extract data from the table
      const data = await page.evaluate((city) => {
        const table = document.querySelector("#divExcel table");

        const rows = table.querySelectorAll("tr");
        console.log(rows);

        // Define an array to store the extracted data
        const extractedData = [];

        // Loop through each row of the table
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cells = row.querySelectorAll("td");

          // Extract values from each cell of the row
          const rowData = {
            serialNumber: cells[0]?.innerText?.trim() || "",
            arn: cells[1]?.innerText.trim() || "",
            holderName: cells[2]?.innerText.trim() || "",
            address: cells[3]?.innerText.trim() || "",
            pin: cells[4]?.innerText.trim() || "",
            email: cells[5]?.innerText?.trim() || "",
            city: cells[6]?.innerText?.trim() || "",

            telephoneResidential: cells[7]?.innerText?.trim() || "",
            telephoneOffice: cells[8]?.innerText?.trim() || "",
            validTill: cells[9]?.innerText?.trim() || "",
            validFrom: cells[10]?.innerText?.trim() || "",
            kydCompliant: cells[11]?.innerText?.trim() || "",
            euin: cells[12]?.innerText.trim() || "",
          };

          // Push the extracted row data to the array
          extractedData.push(rowData);
        }

        return extractedData;
      }, city);

      console.log(data);
      await (() => {
        return new Promise((resolve, reject) => {
          csvWriter
            .writeRecords(data)
            .then(() => {
              console.log("CSV file has been created successfully");
              resolve(data);
            })
            .catch((error) => {
              console.error("Error creating CSV file:", error);
              reject("unable to write in csv");
            });
        });
      })();

      await page.reload({
        waitUntil: ["load", "domcontentloaded", "networkidle0"],
      });
    }
  } catch (error) {
    await browser.close();
    console.error("An error occurred:", error);
    console.log("Restarting the script after 10 minutes...");
    await timeout(2 * 60 * 1000); // Restart after 10 minutes
    console.log(cityCounter);

    await scrapeCities(cityCounter.length);
  }

  // //   await browser.close();
}

scrapeCities();
