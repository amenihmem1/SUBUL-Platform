import os
import tempfile
import time

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .producer import send_to_kafka
from .tool import parse_date_en


def get_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.110 Safari/537.36",
    )

    chrome_bin = os.environ.get("CHROME_BIN", "/usr/bin/chromium")
    if os.path.isfile(chrome_bin):
        options.binary_location = chrome_bin

    user_data_dir = tempfile.mkdtemp()
    options.add_argument(f"--user-data-dir={user_data_dir}")

    driver_path = os.environ.get("CHROMEDRIVER_PATH", "/usr/bin/chromedriver")
    service = Service(executable_path=driver_path) if os.path.isfile(driver_path) else Service()
    return webdriver.Chrome(service=service, options=options)


def scrape_qureos_jobs():
    driver = get_driver()
    base_url = "https://app.qureos.com/jobs/search/in-oman?location=Oman"
    driver.get(base_url)

    all_jobs = []
    max_pages = detect_total_pages(driver)
    print(f"Total pages detected: {max_pages}")

    for current_page in range(1, max_pages + 1):
        try:
            print(f"\nProcessing page {current_page}/{max_pages}")

            if current_page > 1 and not go_to_page(driver, current_page):
                break

            WebDriverWait(driver, 20).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.hover\\:bg-gray-50"))
            )
            time.sleep(2)

            jobs = scrape_current_page(driver)
            all_jobs.extend(jobs)
            print(f"Found {len(jobs)} jobs on this page")

        except Exception as e:
            print(f"Error on page {current_page}: {str(e)}")
            break

    driver.quit()
    return all_jobs


def detect_total_pages(driver):
    try:
        pagination = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'div[slot="pagination-content"]'))
        )
        last_page = int(pagination.find_elements(By.CSS_SELECTOR, 'button')[-2].text)
        return last_page
    except:
        return 1


def go_to_page(driver, target_page):
    try:
        pagination = driver.find_element(By.CSS_SELECTOR, 'div[slot="pagination-content"]')
        page_buttons = pagination.find_elements(By.CSS_SELECTOR, 'button[data-cy="pagination-specific-page-button"]')

        for btn in page_buttons:
            if btn.text.strip() == str(target_page):
                driver.execute_script("arguments[0].click();", btn)
                time.sleep(3)
                return True

        current_page = get_current_page_number(driver)
        while current_page < target_page:
            next_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[data-cy="pagination-next-button"]:not([disabled])'))
            )
            driver.execute_script("arguments[0].click();", next_btn)
            time.sleep(3)
            current_page = get_current_page_number(driver)

        return current_page == target_page

    except Exception as e:
        print(f"Navigation error: {str(e)}")
        return False


def get_current_page_number(driver):
    try:
        active_btn = driver.find_element(By.CSS_SELECTOR, 'button[data-cy="pagination-specific-page-button"].bg-white.text-primary-500')
        return int(active_btn.text)
    except:
        return 1


def scrape_current_page(driver):
    job_elements = driver.find_elements(By.CSS_SELECTOR, "div.hover\\:bg-gray-50")
    jobs = []

    for i, element in enumerate(job_elements):
        try:
            driver.execute_script("arguments[0].click();", element)
            time.sleep(1.5)

            title = element.find_element(By.CSS_SELECTOR, "h3.text-base.font-semibold.text-gray-900").text
            company = element.find_element(By.CSS_SELECTOR, "p.text-gray-900.truncate.capitalize").text
            location = element.find_element(By.CSS_SELECTOR, "p.text-sm.font-normal.text-gray-500").text
            date = element.find_element(By.CSS_SELECTOR, "p.text-gray-400.whitespace-nowrap").text

            detail_html = driver.page_source
            detail_soup = BeautifulSoup(detail_html, "html.parser")

            link_element = detail_soup.select_one("div.my-1.text-xl.font-semibold.text-gray-700.capitalize a[href]")
            if link_element:
                href = link_element['href']
                if href.startswith("http"):
                    job_link = href
                elif href.startswith("/"):
                    job_link = f"https://app.qureos.com{href}"
                else:
                    job_link = f"https://app.qureos.com/{href}"
            else:
                job_link = "Lien non disponible"

            description_div = detail_soup.select_one("div.job-description")
            description = description_div.get_text(strip=True) if description_div else "Description non disponible"

            job = {
                "title": title,
                "company": company,
                "location": location,
                "date_posted": parse_date_en(date),
                "url": job_link,
                "description": description,
                "source": "qureos"
            }

            jobs.append(job)
            send_to_kafka(job)

        except Exception as e:
            print(f"Error processing job {i + 1}: {str(e)}")
            continue

    return jobs


if __name__ == "__main__":
    jobs = scrape_qureos_jobs()
    print(f"\nTotal jobs scraped: {len(jobs)}")

    if not jobs:
        print("No jobs found")
    else:
        for i, job in enumerate(jobs[:3], 1):
            print(f"\n--- Job {i} ---")
            for key, val in job.items():
                if key == "description":
                    print(f"{key}: {val[:200]}...")
                else:
                    print(f"{key}: {val}")
