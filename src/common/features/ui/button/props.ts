import { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { LinkProps } from "react-router-dom";

export type ButtonAppearance =
  | "primary"
  | "secondary"
  | "gray-link"
  | "link"
  | "gray-link"
  | "danger"
  | "success"
  | "warning"
  | "info";
export type ButtonSize = "xxs" | "xs" | "sm" | "md" | "lg" | "display";

interface RegularButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  outline?: boolean;
  className?: string;
  disabled?: boolean;
  full?: boolean;
  icon?: ReactNode;
  iconPlacement?: "left" | "right";
  iconClassName?: string;
  noPadding?: boolean;
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  outline?: boolean;
  className?: string;
  disabled?: boolean;
  full?: boolean;
  icon?: ReactNode;
  iconPlacement?: "left" | "right";
  iconClassName?: string;
  noPadding?: boolean;
}

interface NavLinkButtonProps extends LinkProps {
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  outline?: boolean;
  className?: string;
  disabled?: boolean;
  full?: boolean;
  icon?: ReactNode;
  iconPlacement?: "left" | "right";
  iconClassName?: string;
  noPadding?: boolean;
}

export type ButtonProps = RegularButtonProps | LinkButtonProps | NavLinkButtonProps;
