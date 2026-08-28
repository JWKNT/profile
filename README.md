# Genetic Profile

A static, dependency-free, interactive presentation of one consumer-genetics dataset. It follows the shared [jehlp.net site theme](https://jehlp.net/site-theme/) and deploys through GitHub Pages.

## Included

- 105 accessible Health Predisposition, Carrier Status, Wellness, and Traits reports
- 183 report-specific tested marker/genotype rows
- Ancestry composition and regional signals
- 17 ancestry-timeline estimates
- Ancestry Composition v7.0-versus-v6.0 comparison
- Six chromosome-painting confidence views containing 2,415 segment assignments
- Maternal and paternal haplogroups
- 250 displayed Neanderthal positions and all 38 tested Neanderthal trait markers

## Privacy boundary

The publication dataset omits direct account identifiers, contact details, addresses, birth date, profile identifiers, relatives, family-tree records, account activity, and data-retrieval links. The full raw genome-wide genotype file is not published. Report-specific genotypes remain sensitive genetic data even after direct identifiers are removed.

No DNA-relative or family-member records are included.

## Collection note

The account's prior retrieval emails contained links rather than attachments. A broad local, nested-archive, Gmail, and Google Drive search did not locate a downloaded archive. The signed-in account exposes the download-records area only after stronger two-step verification is configured, so the current dataset exhaustively preserves the accessible interactive personal reports without changing account security or purchasing a subscription.

## Development

```sh
npm test
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## License and medical context

The presentation code is available for inspection. The personal dataset is not offered as a general-purpose dataset. These consumer-genetics results are informational and are not a medical diagnosis.
