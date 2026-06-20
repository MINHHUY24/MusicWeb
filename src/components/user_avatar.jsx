import { User } from "@phosphor-icons/react";
import { useState } from "react";

function UserAvatar({ className = "", name = "", src = "" }) {
  const [failedSrc, setFailedSrc] = useState("");
  const shouldShowImage = Boolean(src && failedSrc !== src);

  return (
    <span className={["user-avatar", className].filter(Boolean).join(" ")} aria-label={name}>
      {shouldShowImage ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <User size={22} weight="bold" />
      )}
    </span>
  );
}

export default UserAvatar;
