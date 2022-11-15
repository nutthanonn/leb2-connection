import lineNotification from "./routers/line-notification";
import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { onChange } from "./helpers/checkOnChange";

interface class_activity_pageType {
  [key: string]: {
    title: string | null;
    publish_date: string | null;
    due_date: string | null;
  }[];
}

dotenv.config();

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    "https://login.leb2.org/login?app_id=1&redirect_uri=https%3A%2F%2Fapp.leb2.org%2Flogin"
  );

  await page.type("#username", process.env.USERNAME as string);
  await page.type("#password", process.env.PASSWORD as string);
  await page.click("button[type=submit]");
  await page.waitForNavigation();

  const class_section = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll(
        'div[class="col-xs-12 col-md-6 col-lg-4 col-xl-3 whole-card "] > div'
      )
      //@ts-ignore
    ).map((item) => item.attributes["data-url"].value);
  });

  const class_activity = class_section.map((item) => {
    return item.replace("/plan/syllabus/index", "/activity");
  });

  var class_activity_page: class_activity_pageType = {};
  var prev_class_activity_page: class_activity_pageType = { "CSS 222-2": [] };

  setInterval(async () => {
    console.log("Checking for new assignment...");

    await page.goto(class_activity[0]);
    for (let i = 0; i < class_activity.length; i++) {
      await page.goto(class_activity[i], {
        timeout: 20000,
        waitUntil: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
      });

      const class_name = await page.evaluate(() => {
        return document
          .querySelector('ol[class="breadcrumb"] > li:nth-child(2) > a')
          ?.textContent?.replace(/\n/g, "")
          .trim();
      });

      const assignment_all = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("tr")).map(
          (item, index) => {
            if (index === 0) {
              return {
                title: "",
                publish_date: "",
                due_date: "",
              };
            }
            return {
              title: item
                .querySelector(
                  `${
                    index === 1 ? "th" : "td:nth-child(1)"
                  } > div > div > a > span`
                )
                ?.textContent?.replace(/\n/g, "")
                .trim(),
              publish_date: item
                .querySelector(
                  `${
                    index === 0 ? "td:nth-child(1)" : "td:nth-child(2)"
                  } > span`
                )
                ?.textContent?.replace(/\n/g, "")
                .trim(),
              due_date: item
                .querySelector(
                  `${index === 0 ? "td:nth-child(2)" : "td:nth-child(3)"}> span`
                )
                ?.textContent?.replace(/\n/g, "")
                .trim(),
            };
          }
        );
      });

      //@ts-ignore
      class_activity_page[class_name] = assignment_all;
    }

    onChange(class_activity_page, prev_class_activity_page);

    prev_class_activity_page = class_activity_page;
    class_activity_page = {};
  }, 1000 * 60 * 10);

  await browser.close();
})();
