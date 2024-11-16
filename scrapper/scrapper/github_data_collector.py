import csv
import requests
from tqdm import tqdm

# get it from env
GITHUB_TOKEN = ""
REPO_OWNER = "a16z-infra"
REPO_NAME = "ai-town"
STARGAZERS_CSV = "ai-town_stargazers.csv"
FORKERS_CSV = "ai-town_forkers.csv"


def get_github_data(endpoint, params=None):
    """Generic function to fetch GitHub API data"""
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    response = requests.get(endpoint, headers=headers, params=params)
    return response.json() if response.status_code == 200 else None


def get_user_info(username):
    """Fetch user information from GitHub API"""
    url = f"https://api.github.com/users/{username}"
    return get_github_data(url)


def save_to_csv(data, filename):
    """Save collected data to CSV file"""
    if not data:
        print("No data to save.")
        return

    keys = data[0].keys()
    with open(filename, "w", newline="", encoding="utf-8") as output_file:
        dict_writer = csv.DictWriter(output_file, fieldnames=keys)
        dict_writer.writeheader()
        dict_writer.writerows(data)


def collect_user_info(users, user_extractor):
    """Generic function to collect user information"""
    collected_info = []

    pbar = tqdm(users, desc="Collecting user info")
    for user in pbar:
        username = user_extractor(user)
        user_info = get_user_info(username)
        if user_info:
            collected_info.append(
                {
                    "person_name": user_info.get("name", ""),
                    "github_profile_link": user_info.get("html_url", ""),
                    "email": user_info.get("email", ""),
                    "company": user_info.get("company", ""),
                    "interests": user_info.get("bio", ""),
                }
            )
        pbar.set_postfix({"users_collected": len(collected_info)})

    return collected_info


def get_paginated_data(endpoint, desc=None, count_field=None):
    """Generic function to fetch paginated GitHub API data
    Args:
        endpoint: API endpoint URL
        desc: Description for progress bar
        count_field: Field name in repo info for total count (e.g., 'forks_count')
    """
    items = []
    page = 1
    pbar = None

    # If we need to show progress, get total count first
    if count_field:
        repo_info = get_github_data(
            f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}"
        )
        total = repo_info.get(count_field, 0) if repo_info else 0
        pbar = tqdm(total=total, desc=desc)

    while True:
        data = get_github_data(endpoint, params={"page": page, "per_page": 100})
        if not data:
            break
        items.extend(data)
        if pbar:
            pbar.update(len(data))
        page += 1

    if pbar:
        pbar.close()
    return items


def get_stargazers():
    """Fetch repository stargazers"""
    endpoint = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/stargazers"
    return get_paginated_data(
        endpoint, desc="Fetching stargazers", count_field="stargazers_count"
    )


def get_forks():
    """Fetch repository forks"""
    endpoint = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/forks"
    return get_paginated_data(
        endpoint, desc="Fetching forks", count_field="forks_count"
    )


def main():
    # Collect stargazers
    stargazers = get_stargazers()
    if stargazers:
        stargazer_info = collect_user_info(stargazers, lambda x: x["login"])
        save_to_csv(stargazer_info, STARGAZERS_CSV)
        print(f"Stargazer data saved to {STARGAZERS_CSV}")
    else:
        print("No stargazers found or failed to fetch data.")

    # Collect forkers
    forkers = get_forks()
    if forkers:
        forker_info = collect_user_info(forkers, lambda x: x["owner"]["login"])
        save_to_csv(forker_info, FORKERS_CSV)
        print(f"Forker data saved to {FORKERS_CSV}")
    else:
        print("No forkers found or failed to fetch data.")


if __name__ == "__main__":
    main()
