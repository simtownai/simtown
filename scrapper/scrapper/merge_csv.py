import glob

import pandas as pd


def combine_csv_files(file_pattern, output_file):
    # Read all CSV files matching the file pattern
    csv_files = glob.glob(file_pattern)

    combined_data = {}

    for file in csv_files:
        data = pd.read_csv(file)

        for index, row in data.iterrows():
            github_profile_link = row["github_profile_link"]
            if github_profile_link not in combined_data:
                combined_data[github_profile_link] = row.to_dict()
                combined_data[github_profile_link]["source_files"] = [file]
            else:
                # Update the existing entry
                combined_data[github_profile_link]["source_files"].append(file)

    # Convert the combined data into a DataFrame
    combined_df = pd.DataFrame.from_dict(combined_data, orient="index")
    combined_df["source_files"] = combined_df["source_files"].apply(
        lambda x: ", ".join(x)
    )

    # Save the combined data to a new CSV file
    combined_df.to_csv(output_file, index=False)
    print(f"Combined data saved to {output_file}")


if __name__ == "__main__":
    file_pattern = "*.csv"  # Update this with the path to your CSV files
    output_file = "combined_data.csv"
    combine_csv_files(file_pattern, output_file)
