import { useEmbed } from "../../../hooks";
import { Box, Flex } from "..";

export const Badge = () => {
  const { settings } = useEmbed();
  return (
    <Flex
      $justifyContent={settings.badge?.alignment || "start"}
      $alignItems="center"
      $gridColumn="1 / -1"
    >
      <Box $fontSize="0.75rem" $marginRight="0.5rem">
        Powered by
      </Box>

      <svg
        width={86}
        height={16}
        viewBox="0 0 86 16"
        style={{ marginTop: "0.125rem" }}
      >
        <path
          d="M21.2354 6.16227C21.1796 5.95015 21.0494 5.76779 20.8261 5.61893C20.6028 5.46635 20.3423 5.39564 20.0408 5.39564C19.3151 5.39564 18.7941 5.69708 18.7941 6.2367C18.7941 6.49721 18.9095 6.69073 19.1402 6.81726C19.3635 6.94379 19.732 7.07033 20.2344 7.18569C21.0084 7.37177 21.4922 7.51691 21.9686 7.7402C22.203 7.85557 22.3928 7.97465 22.5305 8.10863C22.7948 8.3803 22.9548 8.74501 22.9362 9.20276C22.9176 9.86147 22.6571 10.375 22.1547 10.7397C21.6523 11.1082 20.9563 11.2905 20.0818 11.2905C19.2072 11.2905 18.5597 11.1268 18.0312 10.8067C17.5065 10.4867 17.2013 10.0215 17.1194 9.41116L18.6192 9.27719C18.6974 9.57491 18.8723 9.7982 19.1514 9.94706C19.4305 10.0959 19.7394 10.1778 20.0818 10.1778C20.4614 10.1778 20.7777 10.0996 21.0308 9.9359C21.2838 9.77959 21.4104 9.56002 21.4104 9.28835C21.4104 8.90876 21.0531 8.61104 20.5991 8.43613C20.3683 8.35053 20.0855 8.27238 19.7468 8.19423C19.2705 8.07886 18.8946 7.97094 18.6155 7.87418C18.3364 7.78486 18.0908 7.66205 17.8712 7.51319C17.4358 7.21547 17.2832 6.8247 17.2832 6.2367C17.2832 5.61521 17.5325 5.13141 18.0312 4.79648C18.5262 4.46526 19.2035 4.29407 20.0669 4.29407C21.5853 4.29407 22.5752 4.9044 22.7389 6.05807L21.228 6.16227H21.2354Z"
          fill="currentColor"
        />
        <path
          d="M29.4145 8.9796L30.7803 9.55271C30.49 10.0923 30.0621 10.5129 29.5001 10.8217C28.9382 11.1344 28.3167 11.2944 27.6319 11.2944C26.9472 11.2944 26.3629 11.1567 25.8121 10.8701C25.2613 10.5873 24.8147 10.1742 24.4835 9.6383C24.1523 9.09868 23.9811 8.48835 23.9811 7.79987C23.9811 7.11138 24.1486 6.49361 24.4835 5.95771C24.8147 5.41809 25.2613 5.00873 25.8121 4.72589C26.3629 4.44305 26.9732 4.30164 27.6319 4.30164C28.2906 4.30164 28.9382 4.45794 29.5038 4.77427C30.0658 5.08688 30.4938 5.51113 30.7803 6.05075L29.4145 6.62015C29.0535 5.93539 28.3985 5.56323 27.6319 5.56323C27.0327 5.56323 26.5303 5.77536 26.1135 6.19961C25.6967 6.62387 25.492 7.15977 25.492 7.80731C25.492 8.45486 25.6967 8.99076 26.1135 9.40757C26.5303 9.83182 27.0327 10.0439 27.6319 10.0439C28.3985 10.0439 29.0535 9.66807 29.4145 8.98703V8.9796Z"
          fill="currentColor"
        />
        <path
          d="M37.4386 11.2049V7.80341C37.4386 6.35945 36.9139 5.59282 35.697 5.59282C35.0978 5.59282 34.614 5.7975 34.2419 6.21059C33.8623 6.61996 33.6725 7.15214 33.6725 7.80713V11.2086H32.1615V1.9234H33.6725V5.47745C34.1004 4.73315 35.001 4.29773 36.1919 4.29773C37.167 4.29773 37.8666 4.59917 38.302 5.19834C38.7375 5.7975 38.9533 6.66834 38.9533 7.80341V11.2049H37.4349H37.4386Z"
          fill="currentColor"
        />
        <path
          d="M46.5692 5.38819C47.2167 6.07295 47.5777 7.1187 47.5107 8.30587H41.8242C41.9284 8.83805 42.1741 9.26602 42.5611 9.59352C42.9481 9.92473 43.4022 10.0885 43.9157 10.0885C44.8052 10.0885 45.5234 9.59724 45.8844 8.78222L47.1795 9.40372C46.8818 9.99172 46.4352 10.4495 45.8509 10.7881C45.2629 11.1268 44.6191 11.2943 43.9157 11.2943C42.9295 11.2943 42.0178 10.9444 41.3516 10.3453C40.6855 9.7461 40.2649 8.83432 40.2649 7.79602C40.2649 6.75771 40.6892 5.84222 41.3516 5.23933C42.0178 4.64017 42.9295 4.29034 43.9157 4.29034C44.9801 4.29034 45.9216 4.69971 46.5692 5.38447V5.38819ZM42.5388 6.00224C42.1592 6.32974 41.921 6.75772 41.8205 7.29734H46.0221C45.9179 6.75772 45.6835 6.3223 45.3039 5.99852C44.9243 5.67847 44.4628 5.51473 43.9195 5.51473C43.3761 5.51473 42.9221 5.67847 42.5425 6.00597L42.5388 6.00224Z"
          fill="currentColor"
        />
        <path
          d="M59.7699 5.23933C60.1495 5.86827 60.3132 6.68329 60.3132 7.80347V11.2049H58.8023V7.80347C58.8023 6.35952 58.3371 5.59288 57.2318 5.59288C56.6438 5.59288 56.1861 5.79384 55.8586 6.19577C55.5311 6.60141 55.3673 7.13731 55.3673 7.80347V11.2049H53.8489V7.80347C53.8489 6.35952 53.3838 5.59288 52.2785 5.59288C51.6905 5.59288 51.2327 5.79384 50.9052 6.19577C50.574 6.60141 50.4102 7.13731 50.4102 7.80347V11.2049H48.8993V4.39827H50.3433L50.4102 5.47379C50.8196 4.65878 51.5825 4.29407 52.8106 4.29407C53.9606 4.29407 54.7161 4.78531 55.077 5.76407C55.5199 4.81508 56.4428 4.29407 57.7677 4.29407C58.7093 4.29407 59.3829 4.61412 59.7699 5.23562V5.23933Z"
          fill="currentColor"
        />
        <path
          d="M67.4264 5.47382L67.4934 4.3983H68.9373V11.205H67.4934L67.4264 10.1294C67.0282 10.9147 66.1797 11.3092 64.8809 11.3017C63.102 11.3427 61.591 9.79823 61.6283 7.8035C61.591 5.8162 63.102 4.2606 64.8809 4.29782C66.0643 4.29782 67.0096 4.7444 67.4264 5.47754V5.47382ZM66.8049 9.37398C67.2217 8.95717 67.4264 8.43243 67.4264 7.79605C67.4264 7.15967 67.2217 6.64238 66.8049 6.21813C66.3881 5.80132 65.8782 5.58919 65.2828 5.58919C64.6874 5.58919 64.1887 5.80132 63.7719 6.21813C63.355 6.64238 63.1504 7.16711 63.1504 7.79605C63.1504 8.42499 63.355 8.95717 63.7719 9.37398C64.1887 9.79823 64.6911 10.0104 65.2828 10.0104C65.8745 10.0104 66.3881 9.79823 66.8049 9.37398Z"
          fill="currentColor"
        />
        <path
          d="M71.3891 2.85757H72.8926V4.39828H74.6455V5.58172H72.8926V8.9683C72.8926 9.5898 73.1048 9.90985 73.5923 9.96568C73.89 10.0252 74.2398 10.0141 74.6455 9.9359V11.1863C74.1989 11.257 73.7858 11.2943 73.4062 11.2943C72.6731 11.2943 72.1595 11.1082 71.8543 10.7323C71.5454 10.3639 71.3891 9.79076 71.3891 9.02041V5.58172H70.4215V4.39828H71.3891V2.85757Z"
          fill="currentColor"
        />
        <path
          d="M76.1747 3.15526C75.9923 2.98035 75.903 2.76078 75.903 2.50772C75.903 2.25466 75.9923 2.04997 76.1747 1.86762C76.3496 1.69271 76.5691 1.60339 76.8222 1.60339C77.0753 1.60339 77.2874 1.69271 77.4623 1.86762C77.6372 2.04997 77.7265 2.2621 77.7265 2.50772C77.7265 2.75334 77.6372 2.97291 77.4623 3.15526C77.2874 3.33762 77.0678 3.42694 76.8222 3.42694C76.5766 3.42694 76.3496 3.33762 76.1747 3.15526ZM76.0593 4.39826H77.5777V11.2049H76.0593V4.39826Z"
          fill="currentColor"
        />
        <path
          d="M84.3023 8.9796L85.6681 9.55271C85.3778 10.0923 84.9498 10.5129 84.3879 10.8217C83.8259 11.1344 83.2044 11.2944 82.5197 11.2944C81.8349 11.2944 81.2506 11.1567 80.6998 10.8701C80.1491 10.5873 79.7025 10.1742 79.3713 9.6383C79.04 9.09868 78.8689 8.48835 78.8689 7.79987C78.8689 7.11138 79.0363 6.49361 79.3713 5.95771C79.7025 5.41809 80.1528 5.00873 80.6998 4.72589C81.2469 4.44305 81.8609 4.30164 82.5197 4.30164C83.1784 4.30164 83.8259 4.45794 84.3916 4.77427C84.9535 5.08688 85.3815 5.51113 85.6681 6.05075L84.3023 6.62015C83.9413 5.93539 83.2863 5.56323 82.5197 5.56323C81.9205 5.56323 81.4181 5.77536 81.0013 6.19961C80.5845 6.62387 80.3798 7.15977 80.3798 7.80731C80.3798 8.45486 80.5845 8.99076 81.0013 9.40757C81.4181 9.83182 81.9205 10.0439 82.5197 10.0439C83.2863 10.0439 83.9413 9.66807 84.3023 8.98703V8.9796Z"
          fill="currentColor"
        />
        <path
          d="M5.93091 10.8141L7.2758 9.41753L3.83719 5.84667C2.98568 4.9624 2.98568 3.52157 3.83719 2.63731C4.68871 1.75305 6.07617 1.75305 6.92769 2.63731L10.3663 6.20817L11.7112 4.81156L8.27258 1.24069C6.67975 -0.413401 4.08513 -0.413401 2.4923 1.24069C0.899472 2.89479 0.899472 5.58919 2.4923 7.24328L5.93091 10.8141Z"
          fill="currentColor"
        />
        <path
          d="M6.05827 3.54751C5.68761 3.1626 5.08404 3.1626 4.71338 3.54751C4.34272 3.93243 4.34272 4.55921 4.71338 4.94413L9.02103 9.41746L5.93054 12.6268L1.62288 8.15349C1.25223 7.76857 0.648653 7.76857 0.277994 8.15349C-0.0926647 8.5384 -0.0926647 9.16519 0.277994 9.5501L5.93054 15.4201L11.7108 9.41746L6.05827 3.54751Z"
          fill="currentColor"
        />
      </svg>
    </Flex>
  );
};
