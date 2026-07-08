from datetime import datetime
from dateutil.relativedelta import relativedelta
import re

def clean_description(description):
    if not description or description == "N/A":
        return "N/A"

    description = re.sub(r'[\s\t\n\r\xa0]+', ' ', description).strip()

    description = re.sub(r'<[^>]+>', '', description)

    useless_sections = [
        r"Apply Now.*$", r"More Info.*$", r"Click here to apply.*$",
        r"For more details.*$", r"Job Type:.*$", r"Experience Level:.*$",
        r"Location:.*$", r"Posted by.*$", r"See more.*$", r"Read more.*$"
    ]
    for pattern in useless_sections:
        description = re.sub(pattern, '', description, flags=re.IGNORECASE)

    description = re.sub(r'\s{2,}', ' ', description).strip()

    return description



def parse_date_en(date_str):
    now = datetime.now()

    match = re.match(r"(\d+)\s+(month|months|day|days|hour|hours|min|minutes)\s+ago", date_str.lower())
    if match:
        value = int(match.group(1))
        unit = match.group(2)
        if 'month' in unit:
            dt = now - relativedelta(months=value)
        elif 'day' in unit:
            dt = now - relativedelta(days=value)
        elif 'hour' in unit:
            dt = now - relativedelta(hours=value)
        elif 'min' in unit or 'minute' in unit:
            dt = now - relativedelta(minutes=value)
        else:
            dt = now
        return dt.strftime("%Y-%m-%dT%H:%M:%S")

    try:
        dt = datetime.strptime(date_str, "%d/%m/%Y")
        return dt.strftime("%Y-%m-%dT%H:%M:%S")
    except ValueError:
        pass

    try:
        dt = datetime.strptime(date_str + f" {now.year}", "%d %b %Y")
        if dt > now:
            dt = dt.replace(year=dt.year - 1)
        return dt.strftime("%Y-%m-%dT%H:%M:%S")
    except:
        pass

    try:
        dt = datetime.strptime(date_str, "%b %d, %Y")
        return dt.strftime("%Y-%m-%dT%H:%M:%S")
    except:
        pass

    return None
